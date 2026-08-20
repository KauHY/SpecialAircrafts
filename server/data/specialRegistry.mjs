// 特殊涂装必须以注册号维护，并记录有效期。这里不预置未经核验的数据，
// 后续可由管理后台或经授权的数据源维护。
export const specialLiveries = new Map([
  // ['B-1234', { name: '示例彩绘', validFrom: '2026-01-01', validTo: '2026-12-31' }],
])

export const rareAircraftTypes = new Map([
  ['A225', 'Antonov An-225'],
  ['A124', 'Antonov An-124'],
  ['A388', 'Airbus A380-800'],
  ['A345', 'Airbus A340-500'],
  ['A346', 'Airbus A340-600'],
  ['B744', 'Boeing 747-400'],
  ['B748', 'Boeing 747-8'],
  ['BLCF', 'Boeing 747 Dreamlifter'],
  ['MD11', 'McDonnell Douglas MD-11'],
  ['DC10', 'McDonnell Douglas DC-10'],
  ['IL76', 'Ilyushin Il-76'],
  ['AN12', 'Antonov An-12'],
  ['C17', 'Boeing C-17'],
  ['C5M', 'Lockheed C-5M'],
])

export const chineseAirlineIcaoCodes = new Set([
  'CCA', 'CES', 'CSN', 'CHH', 'CSZ', 'CQH', 'CXA', 'CDG', 'CDC', 'CSC',
  'CSH', 'GCR', 'CHB', 'DKH', 'LKE', 'OKA', 'RLH', 'OTT', 'CUA', 'JOY',
])

