import { supabase } from '../lib/supabase';

export const exercisesService = {
  /**
   * Obtiene todos los ejercicios de la base de datos, ordenados alfabéticamente.
   * @returns {Promise<{data: Array, error: object}>}
   */
  async getAll() {
    return await supabase
      .from('ejercicios')
      .select('*')
      .order('nombre', { ascending: true });
  },

  /**
   * Elimina un ejercicio por su ID.
   * @param {string} id - UUID del ejercicio
   * @returns {Promise<{error: object}>}
   */
  async delete(id) {
    return await supabase
      .from('ejercicios')
      .delete()
      .eq('id', id);
  },

  /**
   * Renombra un ejercicio existente.
   * @param {string} id - UUID del ejercicio
   * @param {string} newName - Nuevo nombre en mayúsculas
   * @returns {Promise<{error: object}>}
   */
  async updateName(id, newName) {
    return await supabase
      .from('ejercicios')
      .update({ nombre: newName.toUpperCase() })
      .eq('id', id);
  }
};
