

export async function searchByBarcode(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

    if (!response.ok) {
      throw new Error(`Error al buscar por código: ${response.status}`);
    }

    const data = await response.json();
    console.log('RESPUESTA OPENFOODFACTS:', data);
    
    if (data.status === 0) {
      throw new Error('Producto no encontrado en OpenFoodFacts');
    }
    
    const nutriments = data.product.nutriments || {};
    
    // Mapeo al formato esperado por la UI (simulando FatSecret)
    const mappedFood = {
      food_id: barcode,
      food_name: data.product.product_name || 'Producto desconocido',
      food_description: `Por 100g - Calorías: ${nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0}kcal | Proteínas: ${nutriments.proteins_100g || nutriments.proteins || 0}g | Carbohidratos: ${nutriments.carbohydrates_100g || nutriments.carbohydrates || 0}g | Grasa: ${nutriments.fat_100g || nutriments.fat || 0}g`,
      servings: {
        serving: {
          metric_serving_amount: "100",
          metric_serving_unit: "g",
          calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
          protein: nutriments.proteins_100g || nutriments.proteins || 0,
          carbohydrate: nutriments.carbohydrates_100g || nutriments.carbohydrates || 0,
          fat: nutriments.fat_100g || nutriments.fat || 0
        }
      }
    };
    
    return [mappedFood];
  } catch (err) {
    console.error('ERROR API BARRAS:', err);
    throw err;
  }
}
