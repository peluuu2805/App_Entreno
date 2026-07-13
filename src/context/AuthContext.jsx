import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [keys, setKeys] = useState({ gemini: null, fatsecret: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchKeys(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchKeys(session.user.id);
      } else {
        setKeys({ gemini: null, fatsecret: null });
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchKeys = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('gemini_api_key, fatsecret_api_key')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setKeys({
          gemini: data.gemini_api_key,
          fatsecret: data.fatsecret_api_key
        });
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKeys = async (newKeys) => {
    if (!user) return { error: new Error('User not authenticated') };
    
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        gemini_api_key: newKeys.gemini !== undefined ? newKeys.gemini : keys.gemini,
        fatsecret_api_key: newKeys.fatsecret !== undefined ? newKeys.fatsecret : keys.fatsecret
      }, { onConflict: 'user_id' });

    if (!error) {
      setKeys(prev => ({ ...prev, ...newKeys }));
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, keys, loading, updateKeys, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
