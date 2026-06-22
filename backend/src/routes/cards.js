const express = require('express');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');
const router = express.Router();

// ── LISTAR TODAS AS COLEÇÕES ──────────────────────────────────────
router.get('/collections', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar coleções.' });
  }
});

// ── CROMOS DE UMA COLEÇÃO (com estado do utilizador) ─────────────
router.get('/collections/:slug', auth, async (req, res) => {
  const { slug } = req.params;
  const { rarity, owned } = req.query;
  const userId = req.userId;

  try {
    // Busca a coleção
    const { data: collection, error: collError } = await supabase
      .from('collections')
      .select('*')
      .eq('slug', slug)
      .single();

    if (collError || !collection) {
      return res.status(404).json({ error: 'Coleção não encontrada.' });
    }

    // Busca todos os cromos da coleção
    let query = supabase
      .from('cards')
      .select('*')
      .eq('collection_id', collection.id)
      .order('number');

    if (rarity) query = query.eq('rarity', rarity);

    const { data: cards, error: cardsError } = await query;
    if (cardsError) throw cardsError;

    // Busca os cromos que o utilizador tem
    const { data: userCards } = await supabase
      .from('user_cards')
      .select('card_id, quantity')
      .eq('user_id', userId);

    const userCardMap = {};
    userCards?.forEach(uc => { userCardMap[uc.card_id] = uc.quantity; });

    // Combina
    let result = cards.map(card => ({
      ...card,
      owned: !!userCardMap[card.id],
      quantity: userCardMap[card.id] || 0,
    }));

    // Filtro "em falta" / "tenho"
    if (owned === 'false') result = result.filter(c => !c.owned);
    if (owned === 'true') result = result.filter(c => c.owned);

    const ownedCount = result.filter(c => c.owned).length;

    res.json({
      collection,
      cards: result,
      stats: {
        total: cards.length,
        owned: ownedCount,
        percentage: Math.round((ownedCount / cards.length) * 100),
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar coleção.' });
  }
});

// ── CROMOS DO UTILIZADOR (todos) ─────────────────────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select(`
        quantity,
        obtained_at,
        cards (
          id, name, emoji, rarity, number,
          collections (id, name, emoji, slug)
        )
      `)
      .eq('user_id', req.userId)
      .order('obtained_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar os teus cromos.' });
  }
});

// ── CROMOS REPETIDOS (para trocar) ───────────────────────────────
router.get('/duplicates', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_cards')
      .select(`
        quantity,
        cards (id, name, emoji, rarity, collections(name))
      `)
      .eq('user_id', req.userId)
      .gt('quantity', 1);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar duplicados.' });
  }
});

module.exports = router;
