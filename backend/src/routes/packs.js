const express = require('express');
const supabase = require('../db/supabase');
const auth = require('../middleware/auth');
const router = express.Router();

// ── LISTAR PACKS DISPONÍVEIS ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('packs')
      .select(`*, collections(name, emoji)`)
      .eq('is_active', true)
      .order('price_coins');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar packs.' });
  }
});

// ── COMPRAR E ABRIR PACK ──────────────────────────────────────────
router.post('/:packId/open', auth, async (req, res) => {
  const { packId } = req.params;
  const userId = req.userId;

  try {
    // 1. Busca o pack
    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', packId)
      .eq('is_active', true)
      .single();

    if (packError || !pack) {
      return res.status(404).json({ error: 'Pack não encontrado.' });
    }

    // 2. Verifica as moedas do utilizador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('coins')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Perfil não encontrado.' });
    }

    if (profile.coins < pack.price_coins) {
      return res.status(400).json({
        error: `Moedas insuficientes. Tens ${profile.coins} mas precisas de ${pack.price_coins}.`
      });
    }

    // 3. Sorteia os cromos baseado nas probabilidades
    const wonCards = await drawCards(pack, userId);

    // 4. Desconta as moedas
    const { error: coinError } = await supabase
      .from('profiles')
      .update({ coins: profile.coins - pack.price_coins })
      .eq('id', userId);

    if (coinError) throw coinError;

    // 5. Adiciona os cromos ao utilizador
    for (const card of wonCards) {
      const { data: existing } = await supabase
        .from('user_cards')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('card_id', card.id)
        .single();

      if (existing) {
        await supabase
          .from('user_cards')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('user_cards')
          .insert({ user_id: userId, card_id: card.id, quantity: 1 });
      }
    }

    // 6. Regista o histórico
    await supabase
      .from('pack_openings')
      .insert({
        user_id: userId,
        pack_id: packId,
        cards_won: wonCards.map(c => c.id),
      });

    // 7. Verifica conquistas
    await checkAchievements(userId);

    res.json({
      message: `Pack aberto! Obtiveste ${wonCards.length} cromos.`,
      cards: wonCards,
      coins_remaining: profile.coins - pack.price_coins,
    });

  } catch (err) {
    console.error('Erro ao abrir pack:', err);
    res.status(500).json({ error: 'Erro ao abrir pack.' });
  }
});

// ── HELPER: Sortear cromos por raridade ──────────────────────────
async function drawCards(pack, userId) {
  const probabilities = {
    comum: pack.prob_comum || 0,
    incomum: pack.prob_incomum || 0,
    raro: pack.prob_raro || 0,
    epico: pack.prob_epico || 0,
    lendario: pack.prob_lendario || 0,
    exclusivo: pack.prob_exclusivo || 0,
  };

  const wonCards = [];

  for (let i = 0; i < pack.cards_per_pack; i++) {
    // Sorteia a raridade
    const rarity = drawRarity(probabilities);

    // Busca um cromo aleatório dessa raridade da coleção do pack
    let query = supabase
      .from('cards')
      .select('*')
      .eq('rarity', rarity);

    if (pack.collection_id) {
      query = query.eq('collection_id', pack.collection_id);
    }

    const { data: candidates } = await query;

    if (candidates && candidates.length > 0) {
      const card = candidates[Math.floor(Math.random() * candidates.length)];
      wonCards.push(card);
    }
  }

  return wonCards;
}

function drawRarity(probs) {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const [rarity, prob] of Object.entries(probs)) {
    cumulative += prob;
    if (roll < cumulative) return rarity;
  }

  return 'comum'; // fallback
}

// ── HELPER: Verificar conquistas ─────────────────────────────────
async function checkAchievements(userId) {
  try {
    // Conta cromos únicos
    const { count: uniqueCards } = await supabase
      .from('user_cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Conta packs abertos
    const { count: packsOpened } = await supabase
      .from('pack_openings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Busca conquistas já ganhas
    const { data: earned } = await supabase
      .from('user_achievements')
      .select('achievement_id, achievements(slug)')
      .eq('user_id', userId);

    const earnedSlugs = earned?.map(e => e.achievements.slug) || [];

    // Conquistas a verificar
    const toCheck = [
      { slug: 'first-pack', condition: packsOpened >= 1 },
      { slug: 'collector-100', condition: uniqueCards >= 100 },
      { slug: 'collector-200', condition: uniqueCards >= 200 },
    ];

    for (const check of toCheck) {
      if (check.condition && !earnedSlugs.includes(check.slug)) {
        // Busca o ID da conquista
        const { data: ach } = await supabase
          .from('achievements')
          .select('id, xp_reward')
          .eq('slug', check.slug)
          .single();

        if (ach) {
          await supabase.from('user_achievements').insert({
            user_id: userId,
            achievement_id: ach.id,
          });

          // Dá XP
          await supabase.rpc('increment_xp', {
            user_id_param: userId,
            xp_amount: ach.xp_reward
          });
        }
      }
    }
  } catch (err) {
    console.error('Erro ao verificar conquistas:', err);
    // Não falha o pedido principal
  }
}

module.exports = router;
