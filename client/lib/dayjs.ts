import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'

// Extend dayjs with plugins we need across the app
// advancedFormat adds tokens like Do (day with ordinal) etc.
// relativeTime adds diff formatting helpers
// You can add more plugins here if additional functionality is required later

dayjs.extend(advancedFormat)
dayjs.extend(relativeTime)

export default dayjs;
