const express = require('express');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');
const router = express.Router();

// ── LISTAR O MERCADO ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { q, rarity, collection } = req.query;

  try {
    let query = supabase
      .from('market_listings')
      .select(`
        id, price, created_at,
        cards (id, name, emoji, rarity, collections(name, slug)),
        profiles!seller_id (username, display_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    let result = data;

    // Filtros em memória (para simplicidade — em produção usa SQL)
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(l =>
        l.cards.name.toLowerCase().includes(lower) ||
        l.cards.collections.name.toLowerCase().includes(lower)
      );
    }
    if (rarity) {
      result = result.filter(l => l.cards.rarity === rarity);
    }
    if (collection) {
      result = result.filter(l => l.cards.collections.slug === collection);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar mercado.' });
  }
});

// ── COLOCAR CROMO À VENDA ─────────────────────────────────────────
router.post('/list', auth, async (req, res) => {
  const { card_id, price } = req.body;
  const userId = req.userId;

  if (!card_id || !price || price < 1) {
    return res.status(400).json({ error: 'card_id e preço (mínimo 1) são obrigatórios.' });
  }

  try {
    // Confirma que o utilizador tem o cromo
    const { data: userCard } = await supabase
      .from('user_cards')
      .select('quantity')
      .eq('user_id', userId)
      .eq('card_id', card_id)
      .single();

    if (!userCard || userCard.quantity < 1) {
      return res.status(400).json({ error: 'Não tens este cromo na tua coleção.' });
    }

    // Cria a listagem
    const { data, error } = await supabase
      .from('market_listings')
      .insert({ seller_id: userId, card_id, price })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Cromo colocado à venda!', listing: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar cromo.' });
  }
});

// ── COMPRAR CROMO ─────────────────────────────────────────────────
router.post('/:listingId/buy', auth, async (req, res) => {
  const { listingId } = req.params;
  const buyerId = req.userId;

  try {
    // Busca a listagem
    const { data: listing, error: listError } = await supabase
      .from('market_listings')
      .select(`*, cards(*)`)
      .eq('id', listingId)
      .eq('status', 'active')
      .single();

    if (listError || !listing) {
      return res.status(404).json({ error: 'Listagem não encontrada ou já vendida.' });
    }

    if (listing.seller_id === buyerId) {
      return res.status(400).json({ error: 'Não podes comprar o teu próprio cromo.' });
    }

    // Verifica moedas do comprador
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', buyerId)
      .single();

    if (!buyerProfile || buyerProfile.coins < listing.price) {
      return res.status(400).json({ error: 'Moedas insuficientes.' });
    }

    // Transação: desconta moedas do comprador, credita ao vendedor, transfere cromo
    const [buyerUpdate, sellerUpdate] = await Promise.all([
      supabase.from('profiles').update({ coins: buyerProfile.coins - listing.price }).eq('id', buyerId),
      supabase.rpc('increment_coins', { user_id_param: listing.seller_id, amount: listing.price }),
    ]);

    if (buyerUpdate.error) throw buyerUpdate.error;

    // Adiciona cromo ao comprador
    const { data: existing } = await supabase
      .from('user_cards')
      .select('id, quantity')
      .eq('user_id', buyerId)
      .eq('card_id', listing.card_id)
      .single();

    if (existing) {
      await supabase.from('user_cards').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
    } else {
      await supabase.from('user_cards').insert({ user_id: buyerId, card_id: listing.card_id });
    }

    // Marca listagem como vendida
    await supabase
      .from('market_listings')
      .update({ status: 'sold', buyer_id: buyerId, sold_at: new Date().toISOString() })
      .eq('id', listingId);

    res.json({ message: 'Cromo comprado com sucesso! 🎉', card: listing.cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao comprar cromo.' });
  }
});

// ── CANCELAR LISTAGEM ─────────────────────────────────────────────
router.delete('/:listingId', auth, async (req, res) => {
  const { listingId } = req.params;

  try {
    const { error } = await supabase
      .from('market_listings')
      .update({ status: 'cancelled' })
      .eq('id', listingId)
      .eq('seller_id', req.userId);

    if (error) throw error;
    res.json({ message: 'Listagem cancelada.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar listagem.' });
  }
});

module.exports = router;
