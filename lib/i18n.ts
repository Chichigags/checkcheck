import type { AppLanguage } from './profile'

export function isChinese(lang: AppLanguage | string | null | undefined): boolean {
  return lang === '中文' || lang === 'zh' || lang === 'Chinese'
}

export function normalizeAppLanguage(value: string | null | undefined): AppLanguage {
  if (!value) return 'English'
  const v = value.trim().toLowerCase()
  if (v === '中文' || v === 'zh' || v === 'chinese' || v === 'mandarin' || v === 'cn') return '中文'
  if (v === 'english' || v === 'en') return 'English'
  // Legacy learning-language values → default English for UI language
  return 'English'
}

export const t = {
  welcome(lang?: AppLanguage): string {
    if (isChinese(lang)) {
      return `你好，欢迎来到 CheckCheck — 你的每日宇宙小抄，把中式八字与西方星象合成一条好读、好用的提醒。

请先告诉我一些关于你的信息。越准确，每天的 Check Check 越贴合你。之后也可以随时修改。`
    }
    return `Hi there, welcome to CheckCheck — your daily cosmic cheat sheet, blending Chinese BaZi and Western astrology into one punchy, practical message.

I just need to know you a bit first. The more accurate, the better your reading — you can always tweak things later.`
  },

  completion(lang: AppLanguage): string {
    if (isChinese(lang)) {
      return `设置完成 ✨

你的第一条 Check Check 已经准备好了。

输入 /today 查看今天的内容，或输入 /help 查看全部指令。`
    }
    return `You're all set ✨

Your first Check Check is ready.

Type /today for today's reading, or /help to see all commands.`
  },

  welcomeBack(lang: AppLanguage): string {
    return isChinese(lang)
      ? '欢迎回来！我们接着上次继续。'
      : "Welcome back! Let's continue where we left off."
  },

  finishOnboardingFirst(lang: AppLanguage): string {
    return isChinese(lang)
      ? '请先完成设置。'
      : 'Please finish onboarding first.'
  },

  pleaseSendValue(lang: AppLanguage): string {
    return isChinese(lang) ? '请发送一个有效回答。' : 'Please send a value.'
  },

  chooseOneOf(lang: AppLanguage, options: string[]): string {
    return isChinese(lang)
      ? `请从以下选项中选择：${options.join(' / ')}`
      : `Please choose one of: ${options.join(' / ')}`
  },

  dateFormat(lang: AppLanguage): string {
    return isChinese(lang)
      ? '请使用日期格式 YYYY-MM-DD。'
      : 'Please use date format YYYY-MM-DD.'
  },

  birthTimeHint(lang: AppLanguage, options: string[]): string {
    return isChinese(lang)
      ? `请输入准确时间（HH 或 HH:MM），或选择：${options.join(' / ')}`
      : `Enter exact time (HH or HH:MM) or pick: ${options.join(' / ')}`
  },

  updatedField(lang: AppLanguage, field: string): string {
    return isChinese(lang) ? `已更新 ${field}。` : `Updated ${field}.`
  },

  haveAGreatDay(lang: AppLanguage): string {
    return isChinese(lang) ? '今天也好好过 ✨' : 'Have a great day ✨'
  },

  luckyColour(lang: AppLanguage): string {
    return isChinese(lang) ? '幸运色' : 'Lucky Colour'
  },

  luckyNumber(lang: AppLanguage): string {
    return isChinese(lang) ? '幸运数字' : 'Lucky Number'
  },

  checkCheckFor(lang: AppLanguage, name: string, date: string): string {
    return isChinese(lang)
      ? `${name} 的 CheckCheck（${date}）`
      : `CheckCheck for ${name} (${date})`
  },

  languageUpdated(lang: AppLanguage): string {
    return isChinese(lang)
      ? `语言已切换为中文。之后的消息都会使用中文。`
      : `Language updated to English. Future messages will use English.`
  },

  help(lang: AppLanguage): string {
    if (isChinese(lang)) {
      return [
        '可用指令：',
        '/today - 今天的 CheckCheck',
        '/cosmicid - 查看你的宇宙身份证（八字 + 星象）',
        '/start - 开始或继续设置',
        '/settings - 查看并编辑资料',
        '/reset - 重新设置',
        '/language English|中文 - 切换语言',
        '/pause [天数] - 暂停 1-30 天',
        '/resume - 恢复每日推送',
        '/feedback [内容] - 发送反馈',
        '/stop - 停止自动推送',
        '/help - 显示本列表',
      ].join('\n')
    }
    return [
      'Available commands:',
      '/today - Get today\'s CheckCheck',
      '/cosmicid - View your Cosmic ID (BaZi + Astrology)',
      '/start - Begin or continue onboarding',
      '/settings - View and edit your profile',
      '/reset - Redo onboarding from scratch',
      '/language English|中文 - Change language',
      '/pause [days] - Pause for 1-30 days',
      '/resume - Resume daily sends',
      '/feedback [text] - Send feedback',
      '/stop - Stop automatic daily messages',
      '/help - Show this list',
    ].join('\n')
  },
}
