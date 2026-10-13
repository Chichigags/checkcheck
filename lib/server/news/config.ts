export function newsMode(): boolean { return process.env.BOT_MODE === 'news' }
export function requireNewsMode(): void { if (!newsMode()) throw new Error('Set BOT_MODE=news to enable news production') }
