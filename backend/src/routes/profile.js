const express = require('express');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');
const router = express.Router();

// ── PERFIL DO UTILIZADOR AUTENTICADO ─────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    // Estatísticas
    const [{ count: uniqueCards }, { count: packsOpened }, { count: tradesCount }] = await Promise.all([
      supabase.from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', req.userId),
      supabase.from('pack_openings').select('*', { count: 'exact', head: true }).eq('user_id', req.userId),
      supabase.from('trades').select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`initiator_id.eq.${req.userId},receiver_id.eq.${req.userId}`),
    ]);

    // Conquistas
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select(`earned_at, achievements(name, emoji, description)`)
      .eq('user_id', req.userId)
      .order('earned_at', { ascending: false })
      .limit(10);

    res.json({
      ...profile,
      stats: {
        unique_cards: uniqueCards || 0,
        packs_opened: packsOpened || 0,
        trades_completed: tradesCount || 0,
      },
      achievements: achievements || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil.' });
  }
});

// ── PERFIL PÚBLICO ────────────────────────────────────────────────
router.get('/:username', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, level, xp, created_at')
      .eq('username', req.params.username)
      .single();

    if (error || !profile) return res.status(404).json({ error: 'Utilizador não encontrado.' });

    const { count: uniqueCards } = await supabase
      .from('user_cards').select('*', { count: 'exact', head: true }).eq('user_id', profile.id);

    res.json({ ...profile, stats: { unique_cards: uniqueCards || 0 } });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil.' });
  }
});

module.exports = router;
