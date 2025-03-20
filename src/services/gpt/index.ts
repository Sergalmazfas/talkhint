
/**
 * This file exports the main GPT service as default
 * and re-exports additional services
 */
import GPTBaseService from './GPTBaseService';
import GPTBilingualService from './GPTBilingualService';
import GPTSuggestionsService from './GPTSuggestionsService';
import GPTTranslationService from './GPTTranslationService';

// Export main service (backward compatibility)
const GPTService = new GPTBaseService();

// Export specialized services
export const BilingualService = new GPTBilingualService();
export const SuggestionsService = new GPTSuggestionsService();
export const TranslationService = new GPTTranslationService();

// Export default service
export default GPTService;
