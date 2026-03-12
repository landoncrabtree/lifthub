/**
 * Haptic feedback via browser-haptic.
 * Android: Vibration API. iOS Safari 17.4+: hidden switch toggle fallback.
 */
import Haptic from 'browser-haptic';

export const hapticLight = () => Haptic.light();
export const hapticMedium = () => Haptic.medium();
export const hapticSuccess = () => Haptic.success();
