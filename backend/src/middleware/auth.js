import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const claims = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(claims.sub).select('name email role sessionVersion');
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    if (claims.sessionVersion !== user.sessionVersion) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'You do not have permission to perform this action.' });
}
