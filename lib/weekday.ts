/** Calendar weekday for an ISO date (YYYY-MM-DD), independent of local clock. */
export function weekdayIndex(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay()
}

export function isWeekendDate(isoDate: string): boolean {
  const day = weekdayIndex(isoDate)
  return day === 0 || day === 6
}

export function weekdayLongName(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  })
}

const WORK_TOPIC =
  /工作|事业|职场|上班|加班|\b(work|career|job|office|workplace|workload|deadline)\b/i

export function isWorkCareerTopic(topic: string): boolean {
  return WORK_TOPIC.test(topic)
}

export function containsWorkCareerTalk(text: string): boolean {
  if (
    /工作|事业|上班|加班|老板|同事|客户|职场|开会|汇报|绩效|工位|办公室|通勤|甲方|截止日期/.test(
      text
    )
  ) {
    return true
  }

  return /\b(career|workplace|workload|workday|workweek|at work|your job|the office|bosses?|colleagues?|coworkers?|co-workers?|clients?|deadlines?|commute|overtime|standup|manager)\b/i.test(
    text
  )
}

export function dayContextPrompt(isoDate: string, zh: boolean): string {
  const name = weekdayLongName(isoDate)
  if (isWeekendDate(isoDate)) {
    return zh
      ? `今天是周末（${name}）。不要写工作、事业、上班、加班、老板、同事、客户、开会、截止日期。把任何偏职场的信号转成生活提醒：休息、身体、家人朋友、花钱、家里的事、自己的节奏。`
      : `Today is the weekend (${name}). Do not write about work, career, the job, office, boss, colleagues, clients, meetings, or deadlines. Translate any work-flavoured signal into personal life: rest, body, family, friends, spending, home, or your own pace.`
  }

  return zh
    ? `今天是工作日（${name}）。信号若指向做事或压力，可以写工作、沟通、收尾。不必每天都写事业，但周一到周五写这些是合适的。`
    : `Today is a weekday (${name}). If the signals point there, work, career, finishing a task, or handling pressure are appropriate. Do not force career every weekday, but Monday–Friday it is in-bounds.`
}
