import React, { useState, useCallback } from 'react';

// --- CONSTANTES GLOBALES ---
const MAX_CART_CAPACITY = 40; // Capacidad máxima fija por carro
const DEFAULT_GENERAL_OPTIONS = '3'; // Número de opciones generales por defecto
const MAX_NUMBER_OF_CARTS = 12; // Límite máximo para el número de carros
const MAX_PASSENGERS = 600; // Nuevo límite máximo para el número de pasajeros

// Helper function to convert value to number, treating empty/invalid as 0
// Función auxiliar para convertir un valor a número, tratando vacíos/inválidos como 0
const N = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// Reusable Input Field Component
// Componente de campo de entrada reutilizable
const InputField = ({ label, value, onChange, type = 'text', placeholder = '', error }) => {
  // Manejador de cambio que filtra la entrada si es de tipo 'number'
  const handleChange = (e) => {
    let newValue = e.target.value;
    if (type === 'number') {
      // Filtra para permitir solo dígitos. Los puntos/comas se manejan con la validación de isNaN.
      // Aquí nos aseguramos de que no se puedan escribir letras o símbolos.
      newValue = newValue.replace(/[^0-9]/g, ''); 
    }
    onChange(newValue);
  };

  return (
    <div className="mb-4"> {/* Añadido margen inferior para espaciado */}
      <label className="block text-gray-700 text-sm font-bold mb-2">
        {label}
      </label>
      <input
        className={`shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-red-500 ${error ? 'border-red-500' : ''}`}
        type={type}
        value={value}
        onChange={handleChange} // Usar el nuevo manejador de cambio
        placeholder={placeholder}
      />
      {/* Asegúrate de que 'error' siempre sea una cadena o null/undefined */}
      {error && <p className="text-red-500 text-xs italic mt-1 font-semibold">{error}</p>} {/* Añadido font-semibold */}
    </div>
  );
};

// Helper para obtener la clave de opción (ej. 'option1', 'option2') de un nombre de tipo de comida
// Esta función se ha movido fuera del componente App para que su referencia sea estable.
const getOptionKey = (mealType, optionNames) => { 
  if (mealType === optionNames[0]) return 'option1';
  if (mealType === optionNames[1]) return 'option2';
  if (optionNames.length === 3 && mealType === optionNames[2]) return 'option3';
  return null;
};

// Main App component
const App = () => {
  // --- ESTADOS DEL FORMULARIO Y VALIDACIÓN ---
  const [formData, setFormData] = useState({
    passengers: '',
    totalSpecialMeals: '',
    numCarts: '',
    numGeneralOptions: DEFAULT_GENERAL_OPTIONS,
    optionNames: ['Chicken', 'Beef', 'Vegetarian'],
    optionQuantities: ['', '', ''],
    specialMealsPerCartInput: {},
  });

  // Estado consolidado para errores del formulario
  const [formErrors, setFormErrors] = useState({
    passengers: '',
    totalSpecialMeals: '',
    numCarts: '',
    optionQuantities: ['', '', ''],
    specialMealsPerCart: {},
    specialMealsTotalVsCartSum: '', // Error específico para la suma de especiales por carro
    specialMealsVsPassengers: '', // Nuevo error para comidas especiales vs pasajeros
  });

  // --- ESTADOS DE RESULTADOS ---
  const [mealAlertState, setMealAlertState] = useState({ isProblem: false, message: '' });
  const [distributionResults, setDistributionResults] = useState([]);
  // adjustedDistributionResults ahora siempre será un array, inicialmente vacío
  const [adjustedDistributionResults, setAdjustedDistributionResults] = useState([]); 
  const [excessResults, setExcessResults] = useState([]);


  // --- ESTADOS DE UI/FEEDBACK ---
  const [messageBox, setMessageBox] = useState({ show: false, type: '', message: '' });
  const [copyMessage, setCopyMessage] = useState('');
  const [showExcessNotes, setShowExcessNotes] = useState(false); // Estado para el desplegable de notas

  // Muestra un mensaje temporal en la caja de mensajes (Ahora envuelto en useCallback)
  const showMessage = useCallback((type, message) => {
    setMessageBox({ show: true, type, message });
    setTimeout(() => setMessageBox({ show: false, type: '', message: '' }), 5000); // Usar setMessageBox directamente
  }, []); // Dependencias vacías para que la función sea estable

  // Oculta la caja de mensajes (Ahora envuelto en useCallback)
  const hideMessage = useCallback(() => {
    setMessageBox({ show: false, type: '', message: '' });
  }, []); // Dependencias vacías para que la función sea estable

  // --- LÓGICA DE VALIDACIÓN CENTRALIZADA ---
  // validateNumberInput ahora SIEMPRE devuelve una cadena de error.
  const validateNumberInput = (value, fieldName) => { // Eliminados currentErrors e index de la firma
    const num = Number(value);
    let errorMsg = '';
    if (value === '') {
      errorMsg = ''; // Permitir vacío inicialmente, o establecer error "requerido" si es necesario
    } else if (isNaN(num)) {
      errorMsg = `Please enter a valid number for ${fieldName}.`;
    } else if (num < 0) {
      errorMsg = `Please enter a positive quantity for ${fieldName}.`;
    } else if (fieldName === 'Number of Carts' && num > MAX_NUMBER_OF_CARTS) {
      errorMsg = `Number of carts cannot exceed ${MAX_NUMBER_OF_CARTS}.`;
    } else if (fieldName === 'Total Passengers' && num > MAX_PASSENGERS) { // Nueva validación para pasajeros
      errorMsg = `Total passengers cannot exceed ${MAX_PASSENGERS}.`;
    }
    return errorMsg; // Siempre devuelve una cadena
  };

  // --- HANDLERS DE CAMBIOS DE INPUTS ---
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Validación en tiempo real
    if (field === 'passengers') {
      const errorMsg = validateNumberInput(value, 'Total Passengers');
      setFormErrors(prev => ({ ...prev, passengers: errorMsg, specialMealsVsPassengers: '' }));
    } else if (field === 'totalSpecialMeals') {
      const errorMsg = validateNumberInput(value, 'Total Special Meals');
      setFormErrors(prev => ({ ...prev, totalSpecialMeals: errorMsg, specialMealsVsPassengers: '', specialMealsTotalVsCartSum: '' }));
    } else if (field === 'numCarts') {
      const errorMsg = validateNumberInput(value, 'Number of Carts');
      setFormErrors(prev => ({ ...prev, numCarts: errorMsg, specialMealsTotalVsCartSum: '' }));
    }
  };

  const handleOptionNameChange = (index, value) => {
    const newNames = [...formData.optionNames];
    newNames[index] = value;
    setFormData(prev => ({ ...prev, optionNames: newNames }));
  };

  const handleOptionQuantityChange = (index, value) => {
    const newQuantities = [...formData.optionQuantities];
    newQuantities[index] = value;
    setFormData(prev => ({ ...prev, optionQuantities: newQuantities }));

    const errorMsg = validateNumberInput(value, `${formData.optionNames[index] || `Option ${index + 1}`} Quantity`);
    const newOptionQuantitiesErrors = [...formErrors.optionQuantities];
    newOptionQuantitiesErrors[index] = errorMsg;
    setFormErrors(prev => ({ ...prev, optionQuantities: newOptionQuantitiesErrors }));
  };

  const handleSpecialMealsPerCartChange = (cartNumber, value) => {
    setFormData(prev => ({
      ...prev,
      specialMealsPerCartInput: {
        ...prev.specialMealsPerCartInput,
        [cartNumber]: value
      }
    }));

    const errorMsg = validateNumberInput(value, `Cart ${cartNumber} Special Meals`);
    const newSpecialMealsPerCartErrors = { ...formErrors.specialMealsPerCart };
    newSpecialMealsPerCartErrors[cartNumber] = errorMsg;
    setFormErrors(prev => ({ ...prev, specialMealsPerCart: newSpecialMealsPerCartErrors }));
    // Limpiar el error de suma de especiales por carro
    setFormErrors(prev => ({ ...prev, specialMealsTotalVsCartSum: '' }));
  };

  // --- FUNCIÓN PARA LIMPIAR PARÁMETROS ---
  const clearParameters = () => {
    setFormData({
      passengers: '',
      totalSpecialMeals: '',
      numCarts: '',
      numGeneralOptions: DEFAULT_GENERAL_OPTIONS,
      optionNames: ['Chicken', 'Beef', 'Vegetarian'],
      optionQuantities: ['', '', ''],
      specialMealsPerCartInput: {},
    });

    // Limpiar todos los errores
    setFormErrors({
      passengers: '',
      totalSpecialMeals: '',
      numCarts: '',
      optionQuantities: ['', '', ''],
      specialMealsPerCart: {},
      specialMealsTotalVsCartSum: '',
      specialMealsVsPassengers: '', // Limpiar el nuevo error
    });

    setMealAlertState({ isProblem: false, message: '' });
    setDistributionResults([]);
    setExcessResults([]);
    setAdjustedDistributionResults([]); // Limpiar resultados ajustados a un array vacío
    hideMessage();
    setCopyMessage('');
    setShowExcessNotes(false); // Ocultar notas al limpiar
  };

  // --- LÓGICA DE CÁLCULO REFACTORIZADA ---

  // Calcula valores auxiliares como porcentajes y capacidades base
  // Accede directamente a formData desde el ámbito del componente
  const _calculateAuxiliaryValues = useCallback(() => {
    const totalGeneralMealsAvailable = N(formData.optionQuantities[0]) + N(formData.optionQuantities[1]) + (N(formData.numGeneralOptions) === 3 ? N(formData.optionQuantities[2]) : 0);
    const baseCapacityPerCart = N(formData.numCarts) === 0 ? 0 : Math.floor(totalGeneralMealsAvailable / N(formData.numCarts));
    const cartsWithExtraMeal = totalGeneralMealsAvailable - (baseCapacityPerCart * N(formData.numCarts));

    return {
      totalGeneralMealsAvailable,
      baseCapacityPerCart,
      cartsWithExtraMeal,
      percentOption1: totalGeneralMealsAvailable === 0 ? 0 : N(formData.optionQuantities[0]) / totalGeneralMealsAvailable,
      percentOption2: totalGeneralMealsAvailable === 0 ? 0 : N(formData.optionQuantities[1]) / totalGeneralMealsAvailable,
      percentOption3: N(formData.numGeneralOptions) === 3 ? (totalGeneralMealsAvailable === 0 ? 0 : N(formData.optionQuantities[2]) / totalGeneralMealsAvailable) : 0,
    };
  }, [formData.numCarts, formData.numGeneralOptions, formData.optionQuantities]);

  // Realiza la distribución de comidas por carro
  // Accede directamente a formData desde el ámbito del componente
  const _distributeMealsPerCart = useCallback((auxValues) => { // 'params' argument removed
    const results = [];
    const assigned = { special: [], option1: [], option2: [], option3: [] };

    // FIX: Add early return if no carts to prevent TypeError
    if (N(formData.numCarts) === 0) { // Using formData directly
      return { results, assigned }; // Return empty arrays to prevent destructuring undefined
    }

    for (let i = 1; i <= N(formData.numCarts); i++) { // Using formData directly
      const cartName = `Cart ${i}`;
      const specialMealsForThisCart = N(formData.specialMealsPerCartInput[i]); // Using formData directly

      const generalCapacityForThisCart = Math.min(
        MAX_CART_CAPACITY,
        auxValues.baseCapacityPerCart + (i <= auxValues.cartsWithExtraMeal ? 1 : 0)
      );

      let availableSpaceForGeneral = generalCapacityForThisCart - specialMealsForThisCart;
      availableSpaceForGeneral = Math.max(0, availableSpaceForGeneral);

      let option1Assigned = Math.round(Math.min(availableSpaceForGeneral, availableSpaceForGeneral * auxValues.percentOption1));
      let remainingSpaceAfterOpt1 = availableSpaceForGeneral - option1Assigned;

      let option2Assigned = Math.round(Math.min(remainingSpaceAfterOpt1, availableSpaceForGeneral * auxValues.percentOption2));
      let remainingSpaceAfterOpt2 = remainingSpaceAfterOpt1 - option2Assigned;

      let option3Assigned = 0;
      if (N(formData.numGeneralOptions) === 3) { // Using formData directly
        option3Assigned = Math.round(Math.min(remainingSpaceAfterOpt2, availableSpaceForGeneral * auxValues.percentOption3));
      }

      // Ajuste por redondeo para llenar el carro hasta su capacidad general disponible
      let currentTotalAssignedGeneral = option1Assigned + option2Assigned + option3Assigned;
      let targetTotalGeneralForCart = availableSpaceForGeneral;

      if (currentTotalAssignedGeneral < targetTotalGeneralForCart) {
          let diff = targetTotalGeneralForCart - currentTotalAssignedGeneral;
          // Prioriza añadir a las opciones con mayor porcentaje o las primeras
          if (auxValues.percentOption1 >= auxValues.percentOption2 && auxValues.percentOption1 >= auxValues.percentOption3) {
              option1Assigned += diff;
          } else if (auxValues.percentOption2 >= auxValues.percentOption1 && auxValues.percentOption2 >= auxValues.percentOption3) {
              option2Assigned += diff;
          } else {
              option3Assigned += diff;
          }
      }

      const totalMealsInCart = specialMealsForThisCart + option1Assigned + option2Assigned + option3Assigned;

      results.push({
        cartName,
        special: specialMealsForThisCart,
        option1: option1Assigned,
        option2: option2Assigned,
        option3: option3Assigned,
        total: totalMealsInCart,
      });

      assigned.special.push(specialMealsForThisCart);
      assigned.option1.push(option1Assigned);
      assigned.option2.push(option2Assigned);
      assigned.option3.push(option3Assigned);
    }
    return { results, assigned };
  }, [formData.numCarts, formData.numGeneralOptions, formData.specialMealsPerCartInput]); // Dependencies adjusted

  // Calcula los excedentes
  // Accede directamente a formData desde el ámbito del componente
  const _calculateExcesses = useCallback((assignedMeals) => { // 'params' and 'optionNames' arguments removed
    const sumAssignedSpecial = assignedMeals.special.reduce((sum, qty) => sum + qty, 0);
    const sumAssignedOption1 = assignedMeals.option1.reduce((sum, qty) => sum + qty, 0);
    const sumAssignedOption2 = assignedMeals.option2.reduce((sum, qty) => sum + qty, 0);
    const sumAssignedOption3 = assignedMeals.option3.reduce((sum, qty) => sum + qty, 0);

    const results = [
      { type: 'Specials', quantity: N(formData.totalSpecialMeals) - sumAssignedSpecial }, // Using formData directly
      { type: formData.optionNames[0], quantity: N(formData.optionQuantities[0]) - sumAssignedOption1 }, // Using formData directly
      { type: formData.optionNames[1], quantity: N(formData.optionQuantities[1]) - sumAssignedOption2 }, // Using formData directly
    ];
    if (N(formData.numGeneralOptions) === 3) { // Using formData directly
      results.push({ type: formData.optionNames[2], quantity: N(formData.optionQuantities[2]) - sumAssignedOption3 }); // Using formData directly
    }
    return results;
  }, [formData.numGeneralOptions, formData.optionQuantities, formData.totalSpecialMeals, formData.optionNames]); // Dependencies adjusted

  // --- FUNCIÓN PRINCIPAL DE CÁLCULO ---
  const calculateDistribution = useCallback(() => {
    // Validar todos los campos antes de proceder
    let hasErrors = false;
    const currentErrors = { ...formErrors }; // Copia para acumular errores

    // Validar campos individuales
    const validateAndUpdateError = (value, fieldName, errorKey, label) => {
        const errorString = validateNumberInput(value, label); // validateNumberInput ahora siempre devuelve una cadena
        currentErrors[errorKey] = errorString; // Asigna la cadena directamente
        if (errorString !== '') hasErrors = true; // Si hay una cadena de error, establece hasErrors
        return errorString === ''; // Devuelve true si es válido (la cadena de error está vacía)
    };

    validateAndUpdateError(formData.passengers, 'Total Passengers', 'passengers', 'Total Passengers');
    validateAndUpdateError(formData.totalSpecialMeals, 'Total Special Meals', 'totalSpecialMeals', 'Total Special Meals');
    validateAndUpdateError(formData.numCarts, 'Number of Carts', 'numCarts', 'Number of Carts');

    // Validar cantidades de opciones generales
    const newOptionQuantitiesErrors = [...currentErrors.optionQuantities];
    formData.optionQuantities.forEach((qty, index) => {
        const errorMsg = validateNumberInput(qty, `${formData.optionNames[index] || `Option ${index + 1}`} Quantity`);
        if (errorMsg !== '') {
            newOptionQuantitiesErrors[index] = errorMsg;
            hasErrors = true;
        } else {
            newOptionQuantitiesErrors[index] = '';
        }
    });
    currentErrors.optionQuantities = newOptionQuantitiesErrors;

    // Validar comidas especiales por carro
    const newSpecialMealsPerCartErrors = { ...currentErrors.specialMealsPerCart };
    for (const cartNum in formData.specialMealsPerCartInput) {
        const errorMsg = validateNumberInput(formData.specialMealsPerCartInput[cartNum], `Cart ${cartNum} Special Meals`);
        if (errorMsg !== '') {
            newSpecialMealsPerCartErrors[cartNum] = errorMsg;
            hasErrors = true;
        } else {
            newSpecialMealsPerCartErrors[cartNum] = '';
        }
    }
    currentErrors.specialMealsPerCart = newSpecialMealsPerCartErrors;

    // Validar suma de comidas especiales por carro vs total
    let sumOfSpecialMealsPerCart = 0;
    for (let i = 1; i <= N(formData.numCarts); i++) {
        sumOfSpecialMealsPerCart += N(formData.specialMealsPerCartInput[i]);
    }
    if (sumOfSpecialMealsPerCart > N(formData.totalSpecialMeals)) {
        currentErrors.specialMealsTotalVsCartSum = "Sum of special meals per cart exceeds total special meals available.";
        hasErrors = true;
    } else {
        currentErrors.specialMealsTotalVsCartSum = "";
    }

    // Nueva validación: Total Special Meals vs Total Passengers
    if (N(formData.totalSpecialMeals) > N(formData.passengers)) {
      currentErrors.specialMealsVsPassengers = "Total special meals cannot exceed total passengers.";
      hasErrors = true;
    } else {
      currentErrors.specialMealsVsPassengers = "";
    }

    setFormErrors(currentErrors); // Actualizar el estado de errores

    if (hasErrors) {
      showMessage('error', "Please correct the input errors before calculating.");
      return;
    }

    // --- PROCEDER CON CÁLCULO SI NO HAY ERRORES ---
    const auxValues = _calculateAuxiliaryValues(); // No longer passing formData
    const { results: distResults, assigned: assignedMeals } = _distributeMealsPerCart(auxValues); // No longer passing formData
    const excResults = _calculateExcesses(assignedMeals); // No longer passing formData.optionNames

    setDistributionResults(distResults);
    setExcessResults(excResults);
    setAdjustedDistributionResults([]); // Reiniciar resultados ajustados a un array vacío
    
    // Actualizar el estado de la alerta de comidas
    const totalAvailableMeals = auxValues.totalGeneralMealsAvailable + N(formData.totalSpecialMeals);
    if (totalAvailableMeals < N(formData.passengers)) {
      const mealsNeeded = N(formData.passengers);
      const mealsMissing = mealsNeeded - totalAvailableMeals;
      const coveragePercentage = (mealsNeeded > 0) ? (totalAvailableMeals / mealsNeeded) * 100 : 0; // Evitar división por cero
      setMealAlertState({
        isProblem: true,
        message: (
          <>
            ⚠️ PROBLEM: MEALS MISSING! Not enough meals for all passengers.
            <br />
            <span className="text-sm text-red-700 font-normal">
              ({mealsMissing} meals missing. Coverage: {coveragePercentage.toFixed(1)}%)
            </span>
          </>
        )
      });
    } else {
      setMealAlertState({
        isProblem: false,
        message: "✅ Meal Quantity OK"
      });
    }

  }, [formData, formErrors, _calculateAuxiliaryValues, _distributeMealsPerCart, _calculateExcesses, showMessage]);

  // --- NUEVA FUNCIÓN PARA REDISTRIBUIR EXCEDENTES DE COMIDAS GENERALES ---
  const redistributeExcessMeals = useCallback(() => {
    // Crear copias profundas para evitar mutar el estado original directamente
    const newDistributionResults = JSON.parse(JSON.stringify(distributionResults));
    const newExcessResults = JSON.parse(JSON.stringify(excessResults));

    // Filtrar solo los excedentes de comidas generales (no especiales) con cantidad > 0
    let generalExcessesToDistribute = newExcessResults.filter(e => e.type !== 'Specials' && N(e.quantity) > 0);

    // Iterar sobre cada tipo de comida general con excedente
    generalExcessesToDistribute.forEach(excessMeal => {
      let remainingExcess = N(excessMeal.quantity);
      const mealType = excessMeal.type;
      // getOptionKey ahora es una función global, no necesita ser pasada como dependencia
      const optionKey = getOptionKey(mealType, formData.optionNames); 

      if (!optionKey) return; // Si no se encuentra la clave de opción, se salta (no debería pasar para opciones válidas)

      // Estrategia de distribución: intentar igualar cantidades y luego llenar espacios restantes
      let attempts = 0;
      // MAX_CART_CAPACITY es una constante global, no es necesario en las dependencias.
      const maxAttemptsPerMealType = MAX_CART_CAPACITY * N(formData.numCarts) * 3; // Límite para evitar bucles infinitos

      while (remainingExcess > 0 && attempts < maxAttemptsPerMealType) {
        attempts++;
        let madeProgressInRound = false;

        // Fase 1: Intentar igualar las cantidades de esta opción en los carros que tienen menos
        // Encontrar la cantidad mínima de esta opción en carros con espacio disponible
        let minOptionQtyInCartsWithSpace = Infinity;
        newDistributionResults.forEach(cart => {
          const availableSpaceInCart = MAX_CART_CAPACITY - cart.total;
          if (availableSpaceInCart > 0) {
            minOptionQtyInCartsWithSpace = Math.min(minOptionQtyInCartsWithSpace, cart[optionKey]);
          }
        });

        // Distribuir a los carros que tienen la cantidad mínima (y espacio)
        if (minOptionQtyInCartsWithSpace !== Infinity) {
          for (let i = 0; i < newDistributionResults.length; i++) {
            const cart = newDistributionResults[i];
            const availableSpaceInCart = MAX_CART_CAPACITY - cart.total;
            // Si el carro tiene la cantidad mínima de esta opción, tiene espacio y hay excedente
            if (remainingExcess > 0 && availableSpaceInCart > 0 && cart[optionKey] === minOptionQtyInCartsWithSpace) {
              cart[optionKey]++;
              cart.total++;
              remainingExcess--;
              madeProgressInRound = true;
            }
          }
        }

        // Fase 2: Si no se hizo progreso igualando o si ya no hay mínimos claros,
        // distribuir en un "round-robin" a cualquier carro con espacio
        if (!madeProgressInRound && remainingExcess > 0) {
            let distributedInThisSubRound = false;
            for (let i = 0; i < newDistributionResults.length; i++) {
                const cart = newDistributionResults[i];
                const availableSpaceInCart = MAX_CART_CAPACITY - cart.total;
                if (remainingExcess > 0 && availableSpaceInCart > 0) {
                    cart[optionKey]++;
                    cart.total++;
                    remainingExcess--;
                    distributedInThisSubRound = true;
                    madeProgressInRound = true; // Se hizo progreso
                }
            }
            if (!distributedInThisSubRound && remainingExcess > 0) {
                // Si no se pudo distribuir nada en este sub-round, no hay más espacio disponible
                break;
            }
        }

        if (!madeProgressInRound && remainingExcess > 0) {
            // Si no se hizo ningún progreso en esta ronda completa, salimos para evitar bucle infinito
            break;
        }
      }

      // Actualizar la cantidad de excedente para este tipo de comida
      const excessIndex = newExcessResults.findIndex(e => e.type === mealType);
      if (excessIndex !== -1) {
        newExcessResults[excessIndex].quantity = remainingExcess;
      }
    });

    // Actualizar el estado con los nuevos resultados
    setAdjustedDistributionResults(newDistributionResults);
    setExcessResults(newExcessResults); // Actualizar los excedentes restantes
    showMessage('success', 'Excess general meals redistributed!');

  }, [distributionResults, excessResults, formData.optionNames, showMessage, formData.numCarts]); // formData.numCarts added here


  // Función para copiar los resultados al portapapeles
  const handleCopyResults = () => {
    let copyText = "--- Flight Meal Distribution Results ---\n\n";

    // Añadir Alerta de Comidas
    if (mealAlertState.message) {
      // Si el mensaje es JSX, extraemos el texto
      const alertMessageContent = typeof mealAlertState.message === 'string'
        ? mealAlertState.message
        : mealAlertState.message.props.children.map(child => {
            if (typeof child === 'string') return child;
            if (child && child.props && child.props.children) {
                // Manejar casos en los que los hijos pueden ser un array o un solo elemento
                if (Array.isArray(child.props.children)) {
                    return child.props.children.join('');
                }
                return child.props.children;
            }
            return '';
        }).join('');
      copyText += `Meal Alert: ${alertMessageContent.replace(/\s+/g, ' ').trim()}\n\n`; // Limpiar espacios extra
    }

    // Asegurarse de que adjustedDistributionResults sea un array para la copia
    const currentAdjustedResultsForCopy = Array.isArray(adjustedDistributionResults) ? adjustedDistributionResults : [];
    const resultsToCopy = currentAdjustedResultsForCopy.length > 0 ? currentAdjustedResultsForCopy : distributionResults;
    const sectionTitle = currentAdjustedResultsForCopy.length > 0 ? "Adjusted Distribution by Cart:" : "Initial Distribution by Cart:";

    if (resultsToCopy.length > 0) {
      copyText += sectionTitle + "\n";
      const headers = ["Cart No.", "Specials", formData.optionNames[0] || 'Option 1', formData.optionNames[1] || 'Option 2'];
      if (N(formData.numGeneralOptions) === 3) {
        headers.push(formData.optionNames[2] || 'Option 3');
      }
      headers.push("Total Meals");
      copyText += headers.join("\t") + "\n"; // Separado por tabulaciones

      resultsToCopy.forEach(row => {
        let rowData = [
          row.cartName,
          row.special,
          row.option1,
          row.option2
        ];
        if (N(formData.numGeneralOptions) === 3) {
          rowData.push(row.option3);
        }
        rowData.push(row.total);
        copyText += rowData.join("\t") + "\n";
      });
      copyText += "\n";
    }

    // Añadir Excedentes
    if (excessResults.length > 0) {
      copyText += "Meals to Distribute Manually (Remaining Excesses):\n"; // Título cambiado
      copyText += "Meal Type\tQuantity to Distribute\n";
      excessResults.forEach(row => {
        if (row.quantity !== 0 && row.quantity !== "") {
          copyText += `${row.type}\t${row.quantity}\n`;
        }
      });
      copyText += "\n";
    }

    // Añadir Notas sobre el Exceso de Comidas (si están visibles o no)
    if (showExcessNotes) { // Solo copiar si las notas están actualmente visibles
        copyText += "--- Notes on Excess Meals ---\n";
        copyText += `The excess meals indicated above should be distributed among the different carts if their individual capacity (maximum ${MAX_CART_CAPACITY} units) still allows it.\n`;
        copyText += "If the carts have already reached their maximum capacity or there is not enough space, these meals must be managed manually or assigned to an auxiliary cart if the operation requires it.\n\n";
    }


    // Copiar al portapapeles
    const textarea = document.createElement('textarea');
    textarea.value = copyText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopyMessage('Results copied to clipboard!');
      setTimeout(() => setCopyMessage(''), 3000);
    } catch (err) {
      setCopyMessage('Failed to copy results.');
      console.error('Failed to copy: ', err);
    }
    document.body.removeChild(textarea);
  };

  // Asegurarse de que adjustedDistributionResults sea un array para el renderizado
  const currentAdjustedResults = Array.isArray(adjustedDistributionResults) ? adjustedDistributionResults : [];


  // Render the UI
  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans antialiased flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-4xl">
        {/* Título de la aplicación con recuadro y logo de avión */}
        <div className="bg-gradient-to-r from-red-800 to-red-900 p-4 rounded-lg shadow-md mb-6 flex items-center justify-center space-x-3">
          {/* Emoji de un avión */}
          <span role="img" aria-label="airplane" className="text-3xl leading-none">✈️</span>
          <h1 className="text-3xl font-bold text-white text-center">Flight Meal Distribution Calculator</h1>
        </div>

        {/* Custom Message Box (for critical errors) */}
        {messageBox.show && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white z-50 ${messageBox.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}> {/* Color dinámico aquí */}
            <p className="font-semibold">{messageBox.message}</p>
            <button onClick={hideMessage} className="ml-4 px-2 py-1 bg-white bg-opacity-20 rounded-md hover:bg-opacity-30 transition">
              X
            </button>
          </div>
        )}

        {/* Input Parameters Section */}
        <div className="mb-8 p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800 mb-4">🔧 Input Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 mb-6"> {/* Espaciado aumentado en X e Y */}
            <InputField label="Total Passengers" value={formData.passengers} onChange={(val) => handleInputChange('passengers', val)} type="number" placeholder="Ex: 133" error={formErrors.passengers} />
            <InputField label="Total Special Meals" value={formData.totalSpecialMeals} onChange={(val) => handleInputChange('totalSpecialMeals', val)} type="number" placeholder="Ex: 8" error={formErrors.totalSpecialMeals || formErrors.specialMealsTotalVsCartSum || formErrors.specialMealsVsPassengers} />
            <InputField label="Number of Carts" value={formData.numCarts} onChange={(val) => handleInputChange('numCarts', val)} type="number" placeholder="Ex: 6" error={formErrors.numCarts} />
            
            <div className="mb-4"> {/* Añadido margen inferior para espaciado */}
              <label className="block text-gray-700 text-sm font-bold mb-2">Number of General Options</label>
              <select
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-red-500"
                value={formData.numGeneralOptions}
                onChange={(e) => handleInputChange('numGeneralOptions', e.target.value)}
              >
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>
          </div>

          {/* General Meal Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-3">General Meal Options</h3>
            {[...Array(N(formData.numGeneralOptions))].map((_, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200"> {/* Espaciado aumentado en X e Y */}
                <InputField
                  label={`Option Name ${index + 1}`}
                  value={formData.optionNames[index] || ''}
                  onChange={(val) => handleOptionNameChange(index, val)}
                  type="text"
                  placeholder={`Ex: ${index === 0 ? 'Chicken' : index === 1 ? 'Beef' : 'Vegetarian'}`}
                />
                <InputField
                  label={`Option Quantity ${index + 1}`}
                  value={formData.optionQuantities[index] || ''}
                  onChange={(val) => handleOptionQuantityChange(index, val)}
                  type="number"
                  placeholder="Ex: 100"
                  error={formErrors.optionQuantities[index]}
                />
              </div>
            ))}
          </div>

          {/* Special Meals Per Cart Input */}
          {N(formData.numCarts) > 0 && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Special Meals Per Cart (Manual)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4"> {/* Espaciado aumentado en X e Y */}
                {[...Array(N(formData.numCarts))].map((_, index) => (
                  <InputField
                    key={index}
                    label={`Cart ${index + 1}`}
                    value={formData.specialMealsPerCartInput[index + 1] || ''}
                    onChange={(val) => handleSpecialMealsPerCartChange(index + 1, val)}
                    type="number"
                    placeholder="Quantity"
                    error={formErrors.specialMealsPerCart[index + 1]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4 mt-6">
            <button
              onClick={calculateDistribution}
              className="px-6 py-3 bg-red-700 text-white font-semibold rounded-lg shadow-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition duration-200 ease-in-out"
            >
              Calculate Distribution
            </button>
            <button
              onClick={clearParameters}
              className="px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 ease-in-out"
            >
              Clear Parameters
            </button>
          </div>
        </div>

        {/* Output Section */}
        {distributionResults.length > 0 || mealAlertState.message ? ( // Mostrar sección de salida si existen resultados o hay alerta
          <div className="mt-8 p-6 bg-red-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold text-red-800 mb-4">📊 Distribution Results</h2>

            {/* Meal Alert */}
            <div className={`p-3 rounded-lg text-center mb-6 font-bold ${mealAlertState.isProblem ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
              {mealAlertState.message}
            </div>

            {/* Initial Distribution by Car Table */}
            <h3 className="text-lg font-semibold text-red-800 mb-3">📤 Initial Distribution by Cart</h3>
            <div className="overflow-x-auto rounded-lg shadow-md mb-6">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Cart No.</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Specials</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[0] || 'Option 1'}</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[1] || 'Option 2'}</th>
                    {N(formData.numGeneralOptions) === 3 && (
                      <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[2] || 'Option 3'}</th>
                    )}
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Total Meals</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionResults.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{row.cartName}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{row.special}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option1}</td>
                      <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option2}</td>
                      {N(formData.numGeneralOptions) === 3 && (
                        <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option3}</td>
                      )}
                      <td className="py-2 px-4 border-b text-sm text-gray-800 font-semibold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Excesses Table */}
            <h3 className="text-lg font-semibold text-red-800 mt-6 mb-3">📥 Meals to Distribute Manually (Excesses)</h3>
            <div className="overflow-x-auto rounded-lg shadow-md mb-4">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Meal Type</th>
                    <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Quantity to Distribute</th>
                  </tr>
                </thead>
                <tbody>
                  {excessResults.map((row, index) => (
                    // Solo mostrar si la cantidad no es 0 o vacía
                    (row.quantity !== 0 && row.quantity !== "") && (
                      <tr key={index} className={row.quantity < 0 ? 'bg-red-100' : 'bg-yellow-100'}>
                        <td className="py-2 px-4 border-b text-sm text-gray-800">{row.type}</td>
                        <td className="py-2 px-4 border-b text-sm text-gray-800">{row.quantity}</td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-gray-600 mt-2 px-4 py-2">
                <span className="font-semibold">Note:</span> Negative values in "Quantity to Distribute" indicate a meal deficit.
              </p>
            </div>

            {/* Button to trigger excess redistribution, only if there are general excesses */}
            {excessResults.some(e => e.type !== 'Specials' && N(e.quantity) > 0) && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={redistributeExcessMeals}
                  className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 ease-in-out"
                >
                  Redistribute Excess General Meals
                </button>
              </div>
            )}

            {/* Adjusted Distribution Table (conditionally rendered) */}
            {currentAdjustedResults.length > 0 && ( // Condición actualizada para usar la variable local
              <div className="mt-8 p-6 bg-blue-50 rounded-lg shadow-inner border border-blue-200">
                <h3 className="text-xl font-semibold text-blue-800 mb-4">✨ Adjusted Distribution by Cart</h3>
                <div className="overflow-x-auto rounded-lg shadow-md">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Cart No.</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Specials</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[0] || 'Option 1'}</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[1] || 'Option 2'}</th>
                        {N(formData.numGeneralOptions) === 3 && (
                          <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">{formData.optionNames[2] || 'Option 3'}</th>
                        )}
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Total Meals</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAdjustedResults.map((row, index) => ( // Usar la variable local
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{row.cartName}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{row.special}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option1}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option2}</td>
                          {N(formData.numGeneralOptions) === 3 && (
                            <td className="py-2 px-4 border-b text-sm text-gray-800">{row.option3}</td>
                          )}
                          <td className="py-2 px-4 border-b text-sm text-gray-800 font-semibold">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {/* New Section: Final Notes on Excesses (Collapsible) */}
            <div className="mt-6">
                <button
                    onClick={() => setShowExcessNotes(!showExcessNotes)}
                    className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75 transition duration-200 ease-in-out flex items-center justify-center"
                >
                    {showExcessNotes ? 'Hide Notes on Excess Meals ▲' : 'Show Notes on Excess Meals ▼'}
                </button>
                {showExcessNotes && (
                    <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300 text-yellow-800 mt-4 transition-all duration-300 ease-in-out">
                        <h3 className="text-lg font-semibold mb-2">Notes on Excess Meals:</h3> {/* Título traducido */}
                        <p className="text-sm">
                            The excess meals indicated above should be distributed among the different carts **if their individual capacity (maximum {MAX_CART_CAPACITY} units) still allows it**.
                        </p>
                        <p className="text-sm mt-2">
                            If the carts have already reached their maximum capacity or there is not enough space, these meals must be managed **manually** or assigned to an **auxiliary cart** if the operation requires it.
                        </p>
                    </div>
                )}
            </div>


            {/* Copy Results Button */}
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={handleCopyResults}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 ease-in-out"
              >
                Copy Results
              </button>
              {copyMessage && (
                <p className="ml-4 self-center text-sm text-gray-600">{copyMessage}</p>
              )}
            </div>
          </div>
        ) : ( // Mensaje inicial cuando aún no hay resultados
          <div className="mt-8 p-6 bg-gray-200 rounded-lg text-center text-gray-700">
            <p className="text-lg font-semibold mb-2">Welcome to the Flight Meal Distribution Calculator!</p>
            <p>Enter your flight parameters above and click 'Calculate Distribution' to see the meal breakdown by cart and any excesses.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
