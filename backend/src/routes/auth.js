const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../db/supabase');
const router = express.Router();

// ── REGISTO ──────────────────────────────────────────────────────
router.post('/register', [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Password deve ter pelo menos 6 caracteres'),
  body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username: 3-20 caracteres, apenas letras, números e _'),
  body('display_name').isLength({ min: 2, max: 40 }).withMessage('Nome deve ter 2-40 caracteres'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, username, display_name } = req.body;

  try {
    // Verifica se o username já existe
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Este username já está em uso.' });
    }

    // Cria utilizador no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // em dev, confirma automaticamente
    });

    if (authError) throw authError;

    // Cria perfil na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        display_name,
        coins: 500, // moedas de boas-vindas
      });

    if (profileError) throw profileError;

    res.status(201).json({
      message: 'Conta criada com sucesso! Tens 500 moedas de boas-vindas 🎉',
      user: { id: authData.user.id, email, username, display_name }
    });

  } catch (err) {
    console.error('Erro no registo:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar conta.' });
  }
});

// ── LOGIN ────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: 'Email ou password incorretos.' });
    }

    // Busca o perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: { ...data.user, profile }
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro no login.' });
  }
});

// ── REFRESH TOKEN ────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'Refresh token em falta.' });

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Token expirado. Faz login novamente.' });

    res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao renovar sessão.' });
  }
});

module.exports = router;
