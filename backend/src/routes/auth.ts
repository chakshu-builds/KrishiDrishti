import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// Get current farmer profile (defaults to primary farmer or by id)
router.get('/profile', (req: Request, res: Response) => {
  const profileId = (req.query.id as string) || 'usr-farmer-001';
  const profile = store.getProfileById(profileId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({ profile });
});

// Update profile preferences (language, contact, consent)
router.patch('/profile', (req: Request, res: Response) => {
  const targetProfileId = (req.body.id as string) || 'usr-farmer-001';
  const requesterId = (req.headers['x-farmer-id'] || req.headers['x-user-id'] || req.body.requesterId) as string | undefined;

  if (requesterId) {
    const cleanId = requesterId.startsWith('token-') ? requesterId.split('-').slice(1, 4).join('-') : requesterId;
    const requester = store.getProfileById(cleanId) || store.getProfileById(requesterId);
    if (requester && requester.role !== 'admin' && requester.id !== targetProfileId) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another user\'s profile preferences' });
    }
  }

  const updates = req.body;
  const updated = store.updateProfile(targetProfileId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({ profile: updated, message: 'Profile updated successfully' });
});

// Register new farmer or FPO profile
router.post('/signup', (req: Request, res: Response) => {
  const { fullName, phoneNumber, preferredLanguage, role, fpoId } = req.body;
  if (!fullName || !phoneNumber) {
    return res.status(400).json({ error: 'Full name and phone number are required' });
  }

  // Check if phone number already registered
  const existing = store.getProfiles().find((p) => p.phoneNumber === phoneNumber);
  if (existing) {
    return res.status(409).json({ error: 'A profile with this phone number already exists', profile: existing });
  }

  const newProfile = store.createProfile({
    fullName,
    phoneNumber,
    preferredLanguage: preferredLanguage || 'hi',
    role: role || 'farmer',
    fpoId: fpoId || undefined,
    locationConsent: true,
    alertConsent: { sms: true, voice: true, whatsapp: true },
  });

  return res.status(201).json({
    message: 'Profile registered successfully',
    profile: newProfile,
    token: `token-${newProfile.id}-${Date.now()}`,
  });
});

// Login / Authenticate
router.post('/login', (req: Request, res: Response) => {
  const { phoneNumber, profileId } = req.body;
  let profile = null;

  if (profileId) {
    profile = store.getProfileById(profileId);
  } else if (phoneNumber) {
    profile = store.getProfiles().find((p) => p.phoneNumber === phoneNumber || p.phoneNumber.endsWith(phoneNumber.replace(/^0+/, '')));
  }

  if (!profile) {
    // If phone not found in test mode, return 401 with helpful message
    return res.status(401).json({
      error: 'Invalid phone credentials. Use one of the registered test accounts or sign up.',
      availableTestAccounts: store.getProfiles().map((p) => ({ id: p.id, name: p.fullName, phone: p.phoneNumber, role: p.role })),
    });
  }

  return res.json({
    message: 'Login successful',
    profile,
    token: `token-${profile.id}-${Date.now()}`,
  });
});

// Switch role context
router.post('/switch-role', (req: Request, res: Response) => {
  const { profileId } = req.body;
  const profile = store.getProfileById(profileId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  return res.json({
    message: `Switched active profile to ${profile.fullName} (${profile.role})`,
    profile,
  });
});

// List all profiles for quick role switching in dev/testing
router.get('/users', (_req: Request, res: Response) => {
  const profiles = store.getProfiles();
  return res.json({ profiles });
});

export default router;
