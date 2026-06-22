const express = require('express');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');
const router = express.Router();

// ── PROPOR TROCA ──────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  const { receiver_id, offered_card_id, wanted_card_id } = req.body;
  const initiatorId = req.userId;

  if (!receiver_id || !offered_card_id || !wanted_card_id) {
    return res.status(400).json({ error: 'Campos em falta: receiver_id, offered_card_id, wanted_card_id.' });
  }

  if (receiver_id === initiatorId) {
    return res.status(400).json({ error: 'Não podes propor uma troca contigo próprio.' });
  }

  try {
    // Verifica que o iniciador tem o cromo oferecido
    const { data: initiatorCard } = await supabase
      .from('user_cards')
      .select('quantity')
      .eq('user_id', initiatorId)
      .eq('card_id', offered_card_id)
      .single();

    if (!initiatorCard || initiatorCard.quantity < 1) {
      return res.status(400).json({ error: 'Não tens o cromo que queres oferecer.' });
    }

    // Verifica que o recetor tem o cromo pretendido
    const { data: receiverCard } = await supabase
      .from('user_cards')
      .select('quantity')
      .eq('user_id', receiver_id)
      .eq('card_id', wanted_card_id)
      .single();

    if (!receiverCard || receiverCard.quantity < 1) {
      return res.status(400).json({ error: 'O outro utilizador não tem esse cromo.' });
    }

    // Cria a proposta de troca
    const { data, error } = await supabase
      .from('trades')
      .insert({ initiator_id: initiatorId, receiver_id, offered_card_id, wanted_card_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'Proposta de troca enviada!', trade: data });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao propor troca.' });
  }
});

// ── TROCAS PENDENTES ──────────────────────────────────────────────
router.get('/pending', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trades')
      .select(`
        *,
        offered_card:cards!offered_card_id (name, emoji, rarity),
        wanted_card:cards!wanted_card_id (name, emoji, rarity),
        initiator:profiles!initiator_id (username, display_name),
        receiver:profiles!receiver_id (username, display_name)
      `)
      .eq('status', 'pending')
      .or(`initiator_id.eq.${req.userId},receiver_id.eq.${req.userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar trocas.' });
  }
});

// ── ACEITAR OU REJEITAR TROCA ─────────────────────────────────────
router.patch('/:tradeId', auth, async (req, res) => {
  const { tradeId } = req.params;
  const { action } = req.body; // 'accept' ou 'reject'
  const userId = req.userId;

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action deve ser "accept" ou "reject".' });
  }

  try {
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();

    if (tradeError || !trade) {
      return res.status(404).json({ error: 'Troca não encontrada.' });
    }

    if (action === 'reject') {
      await supabase.from('trades').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', tradeId);
      return res.json({ message: 'Troca rejeitada.' });
    }

    // Executa a troca de cromos
    // Remove cromo oferecido do iniciador, adiciona ao recetor
    await transferCard(trade.initiator_id, userId, trade.offered_card_id);
    // Remove cromo pretendido do recetor, adiciona ao iniciador
    await transferCard(userId, trade.initiator_id, trade.wanted_card_id);

    await supabase.from('trades').update({ status: 'accepted', resolved_at: new Date().toISOString() }).eq('id', tradeId);

    res.json({ message: 'Troca concluída com sucesso! 🤝' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar troca.' });
  }
});

async function transferCard(fromUserId, toUserId, cardId) {
  // Decrementa de quem dá
  const { data: fromCard } = await supabase
    .from('user_cards').select('id, quantity').eq('user_id', fromUserId).eq('card_id', cardId).single();

  if (fromCard.quantity === 1) {
    await supabase.from('user_cards').delete().eq('id', fromCard.id);
  } else {
    await supabase.from('user_cards').update({ quantity: fromCard.quantity - 1 }).eq('id', fromCard.id);
  }

  // Incrementa para quem recebe
  const { data: toCard } = await supabase
    .from('user_cards').select('id, quantity').eq('user_id', toUserId).eq('card_id', cardId).single();

  if (toCard) {
    await supabase.from('user_cards').update({ quantity: toCard.quantity + 1 }).eq('id', toCard.id);
  } else {
    await supabase.from('user_cards').insert({ user_id: toUserId, card_id: cardId });
  }
}

module.exports = router;
