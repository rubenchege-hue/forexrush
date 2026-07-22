import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const FOREX_PAIRS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/CHF'];
const FOREX_PRICES: Record<string, number> = {
  'EUR/USD': 1.0876, 'GBP/USD': 1.2734, 'USD/JPY': 149.82, 'AUD/USD': 0.6543,
  'USD/CAD': 1.3621, 'NZD/USD': 0.6127, 'EUR/GBP': 0.8542, 'EUR/JPY': 163.01,
  'GBP/JPY': 190.72, 'USD/CHF': 0.8834,
};

const LICENSE_CODES = [
  { code: 'COMP-YQW5-MWGW', client: 'Client 1', email: 'client1@example.com' },
  { code: 'COMP-5ZBA-OS8N', client: 'Client 2', email: 'client2@example.com' },
  { code: 'COMP-AJE7-PNV0', client: 'Client 3', email: 'client3@example.com' },
  { code: 'COMP-DSZX-PDP8', client: 'Client 4', email: 'client4@example.com' },
  { code: 'COMP-6VP5-DSI6', client: 'Client 5', email: 'client5@example.com' },
  { code: 'COMP-JF3N-6XHZ', client: 'Client 6', email: 'client6@example.com' },
  { code: 'COMP-02X0-D7P3', client: 'Client 7', email: 'client7@example.com' },
  { code: 'COMP-SJ4Y-5OG2', client: 'Client 8', email: 'client8@example.com' },
  { code: 'COMP-L5FY-TU3G', client: 'Client 9', email: 'client9@example.com' },
  { code: 'COMP-98MM-ILWH', client: 'Client 10', email: 'client10@example.com' },
  { code: 'COMP-R68A-EARX', client: 'Client 11', email: 'client11@example.com' },
  { code: 'COMP-N0JQ-GX72', client: 'Client 12', email: 'client12@example.com' },
  { code: 'COMP-0RNW-7V8V', client: 'Client 13', email: 'client13@example.com' },
  { code: 'COMP-6KM2-HRG2', client: 'Client 14', email: 'client14@example.com' },
  { code: 'COMP-70GU-JFEE', client: 'Client 15', email: 'client15@example.com' },
  { code: 'COMP-R68R-WZFD', client: 'Client 16', email: 'client16@example.com' },
  { code: 'COMP-WFMO-LZWY', client: 'Client 17', email: 'client17@example.com' },
  { code: 'COMP-NXYS-499B', client: 'Client 18', email: 'client18@example.com' },
  { code: 'COMP-BVYE-COVY', client: 'Client 19', email: 'client19@example.com' },
  { code: 'COMP-843R-FJYE', client: 'Client 20', email: 'client20@example.com' },
  { code: 'COMP-K4K2-EG80', client: 'Client 21', email: 'client21@example.com' },
  { code: 'COMP-5UO9-WZPC', client: 'Client 22', email: 'client22@example.com' },
  { code: 'COMP-WANN-RPD1', client: 'Client 23', email: 'client23@example.com' },
  { code: 'COMP-9O5M-2S3J', client: 'Client 24', email: 'client24@example.com' },
  { code: 'COMP-Q6T4-7QQ6', client: 'Client 25', email: 'client25@example.com' },
  { code: 'COMP-BN3H-CRVA', client: 'Client 26', email: 'client26@example.com' },
  { code: 'COMP-8D85-9AX9', client: 'Client 27', email: 'client27@example.com' },
  { code: 'COMP-WROU-JZ6H', client: 'Client 28', email: 'client28@example.com' },
  { code: 'COMP-RMTV-BPVU', client: 'Client 29', email: 'client29@example.com' },
  { code: 'COMP-VWEK-MQMQ', client: 'Client 30', email: 'client30@example.com' },
  { code: 'COMP-AH9G-RGYV', client: 'Client 31', email: 'client31@example.com' },
  { code: 'COMP-6WL8-7N2N', client: 'Client 32', email: 'client32@example.com' },
  { code: 'COMP-M486-ZBUO', client: 'Client 33', email: 'client33@example.com' },
  { code: 'COMP-1NRD-URN4', client: 'Client 34', email: 'client34@example.com' },
  { code: 'COMP-SI6S-V5MD', client: 'Client 35', email: 'client35@example.com' },
  { code: 'COMP-XP74-DHSF', client: 'Client 36', email: 'client36@example.com' },
  { code: 'COMP-DHTO-826A', client: 'Client 37', email: 'client37@example.com' },
  { code: 'COMP-MY3C-PCTD', client: 'Client 38', email: 'client38@example.com' },
  { code: 'COMP-FLBJ-I3L6', client: 'Client 39', email: 'client39@example.com' },
  { code: 'COMP-0D9J-9POW', client: 'Client 40', email: 'client40@example.com' },
  { code: 'COMP-K964-JCJO', client: 'Client 41', email: 'client41@example.com' },
  { code: 'COMP-X05U-ITVI', client: 'Client 42', email: 'client42@example.com' },
  { code: 'COMP-IMLP-9GY6', client: 'Client 43', email: 'client43@example.com' },
  { code: 'COMP-2KMI-VOHA', client: 'Client 44', email: 'client44@example.com' },
  { code: 'COMP-ALUE-IUII', client: 'Client 45', email: 'client45@example.com' },
  { code: 'COMP-HESI-DJBB', client: 'Client 46', email: 'client46@example.com' },
  { code: 'COMP-CKFR-717H', client: 'Client 47', email: 'client47@example.com' },
  { code: 'COMP-CWHV-5G83', client: 'Client 48', email: 'client48@example.com' },
  { code: 'COMP-76H9-E7XI', client: 'Client 49', email: 'client49@example.com' },
  { code: 'COMP-UED6-6BC7', client: 'Client 50', email: 'client50@example.com' },
  { code: 'COMP-T5VT-8NL1', client: 'Client 51', email: 'client51@example.com' },
  { code: 'COMP-M5UF-2JA7', client: 'Client 52', email: 'client52@example.com' },
  { code: 'COMP-W0Y2-1H19', client: 'Client 53', email: 'client53@example.com' },
  { code: 'COMP-DMS6-QEZZ', client: 'Client 54', email: 'client54@example.com' },
  { code: 'COMP-RPMT-PP5M', client: 'Client 55', email: 'client55@example.com' },
  { code: 'COMP-HSKV-FBPZ', client: 'Client 56', email: 'client56@example.com' },
  { code: 'COMP-NGLT-OU1E', client: 'Client 57', email: 'client57@example.com' },
  { code: 'COMP-R4QD-988S', client: 'Client 58', email: 'client58@example.com' },
  { code: 'COMP-30DX-E5W2', client: 'Client 59', email: 'client59@example.com' },
  { code: 'COMP-2SOC-LLT0', client: 'Client 60', email: 'client60@example.com' },
  { code: 'COMP-7PTQ-ZBF1', client: 'Client 61', email: 'client61@example.com' },
  { code: 'COMP-K6WV-CP13', client: 'Client 62', email: 'client62@example.com' },
  { code: 'COMP-74YR-THVM', client: 'Client 63', email: 'client63@example.com' },
  { code: 'COMP-WDPJ-ULSQ', client: 'Client 64', email: 'client64@example.com' },
  { code: 'COMP-SNZH-OVZK', client: 'Client 65', email: 'client65@example.com' },
  { code: 'COMP-3OTD-7T7D', client: 'Client 66', email: 'client66@example.com' },
  { code: 'COMP-TIHK-M84J', client: 'Client 67', email: 'client67@example.com' },
  { code: 'COMP-O6J5-ZJW0', client: 'Client 68', email: 'client68@example.com' },
  { code: 'COMP-44ZN-7UQ0', client: 'Client 69', email: 'client69@example.com' },
  { code: 'COMP-36JX-25K6', client: 'Client 70', email: 'client70@example.com' },
  { code: 'COMP-R6E5-EGHZ', client: 'Client 71', email: 'client71@example.com' },
  { code: 'COMP-2I6Q-SP50', client: 'Client 72', email: 'client72@example.com' },
  { code: 'COMP-ZIKQ-KBDR', client: 'Client 73', email: 'client73@example.com' },
  { code: 'COMP-USE5-BYDZ', client: 'Client 74', email: 'client74@example.com' },
  { code: 'COMP-VIKD-15OS', client: 'Client 75', email: 'client75@example.com' },
  { code: 'COMP-TI6K-GLQ9', client: 'Client 76', email: 'client76@example.com' },
  { code: 'COMP-U9Z0-NH52', client: 'Client 77', email: 'client77@example.com' },
  { code: 'COMP-XBSX-U5KE', client: 'Client 78', email: 'client78@example.com' },
  { code: 'COMP-X9C9-EX2E', client: 'Client 79', email: 'client79@example.com' },
  { code: 'COMP-5WV6-CZWR', client: 'Client 80', email: 'client80@example.com' },
  { code: 'COMP-AKSU-NJ0H', client: 'Client 81', email: 'client81@example.com' },
  { code: 'COMP-9HRG-XXFO', client: 'Client 82', email: 'client82@example.com' },
  { code: 'COMP-BO7X-SP4J', client: 'Client 83', email: 'client83@example.com' },
  { code: 'COMP-SPFY-QDNP', client: 'Client 84', email: 'client84@example.com' },
  { code: 'COMP-SOLW-MTWV', client: 'Client 85', email: 'client85@example.com' },
  { code: 'COMP-123S-OS0O', client: 'Client 86', email: 'client86@example.com' },
  { code: 'COMP-WN1Z-9X6N', client: 'Client 87', email: 'client87@example.com' },
  { code: 'COMP-Y5BD-J6B2', client: 'Client 88', email: 'client88@example.com' },
  { code: 'COMP-PW4J-WN5O', client: 'Client 89', email: 'client89@example.com' },
  { code: 'COMP-PWKJ-MYES', client: 'Client 90', email: 'client90@example.com' },
  { code: 'COMP-F754-77PD', client: 'Client 91', email: 'client91@example.com' },
  { code: 'COMP-K08B-ICU2', client: 'Client 92', email: 'client92@example.com' },
  { code: 'COMP-UUKD-0XPA', client: 'Client 93', email: 'client93@example.com' },
  { code: 'COMP-W95M-YZ9I', client: 'Client 94', email: 'client94@example.com' },
  { code: 'COMP-WNGE-E3OV', client: 'Client 95', email: 'client95@example.com' },
  { code: 'COMP-Z10P-JTRA', client: 'Client 96', email: 'client96@example.com' },
  { code: 'COMP-0FKA-BKKZ', client: 'Client 97', email: 'client97@example.com' },
  { code: 'COMP-8834-FY9G', client: 'Client 98', email: 'client98@example.com' },
  { code: 'COMP-32XU-WQAN', client: 'Client 99', email: 'client99@example.com' },
  { code: 'COMP-5YG5-MZZY', client: 'Client 100', email: 'client100@example.com' },
  { code: 'COMP-L0SH-4ZU6', client: 'Client 101', email: 'client101@example.com' },
  { code: 'COMP-64J8-CAKK', client: 'Client 102', email: 'client102@example.com' },
  { code: 'COMP-FVTG-3601', client: 'Client 103', email: 'client103@example.com' },
  { code: 'COMP-AL65-HQ7S', client: 'Client 104', email: 'client104@example.com' },
  { code: 'COMP-X7RX-SGLH', client: 'Client 105', email: 'client105@example.com' },
  { code: 'COMP-794E-7D8W', client: 'Client 106', email: 'client106@example.com' },
  { code: 'COMP-404N-P09V', client: 'Client 107', email: 'client107@example.com' },
  { code: 'COMP-9X0T-WWY8', client: 'Client 108', email: 'client108@example.com' },
  { code: 'COMP-FFZO-DYYO', client: 'Client 109', email: 'client109@example.com' },
  { code: 'COMP-FB0S-UUD6', client: 'Client 110', email: 'client110@example.com' },
  { code: 'COMP-6WK4-91LH', client: 'Client 111', email: 'client111@example.com' },
  { code: 'COMP-L50C-1LSS', client: 'Client 112', email: 'client112@example.com' },
  { code: 'COMP-ZAJA-QQJA', client: 'Client 113', email: 'client113@example.com' },
  { code: 'COMP-TXBT-VBF4', client: 'Client 114', email: 'client114@example.com' },
  { code: 'COMP-GOWF-P2TN', client: 'Client 115', email: 'client115@example.com' },
  { code: 'COMP-OYXZ-O2QX', client: 'Client 116', email: 'client116@example.com' },
  { code: 'COMP-IT6K-VRCX', client: 'Client 117', email: 'client117@example.com' },
  { code: 'COMP-FDRM-QNK7', client: 'Client 118', email: 'client118@example.com' },
  { code: 'COMP-MQN0-K910', client: 'Client 119', email: 'client119@example.com' },
  { code: 'COMP-QQU4-YEYE', client: 'Client 120', email: 'client120@example.com' },
  { code: 'COMP-U0E8-3QY9', client: 'Client 121', email: 'client121@example.com' },
  { code: 'COMP-HJ09-0KB8', client: 'Client 122', email: 'client122@example.com' },
  { code: 'COMP-F0TC-CZSE', client: 'Client 123', email: 'client123@example.com' },
  { code: 'COMP-L6QF-751V', client: 'Client 124', email: 'client124@example.com' },
  { code: 'COMP-2EOU-W0S8', client: 'Client 125', email: 'client125@example.com' },
  { code: 'COMP-44X4-IJTB', client: 'Client 126', email: 'client126@example.com' },
  { code: 'COMP-NB3Y-LYLO', client: 'Client 127', email: 'client127@example.com' },
  { code: 'COMP-Z3IZ-CFZL', client: 'Client 128', email: 'client128@example.com' },
  { code: 'COMP-KYYL-UXIW', client: 'Client 129', email: 'client129@example.com' },
  { code: 'COMP-VXYB-HTGX', client: 'Client 130', email: 'client130@example.com' },
  { code: 'COMP-3P3P-1SFZ', client: 'Client 131', email: 'client131@example.com' },
  { code: 'COMP-X9CX-9E3A', client: 'Client 132', email: 'client132@example.com' },
  { code: 'COMP-MB97-1OLD', client: 'Client 133', email: 'client133@example.com' },
  { code: 'COMP-O0RV-SKHN', client: 'Client 134', email: 'client134@example.com' },
  { code: 'COMP-3CWU-OIEQ', client: 'Client 135', email: 'client135@example.com' },
  { code: 'COMP-7SF8-09LV', client: 'Client 136', email: 'client136@example.com' },
  { code: 'COMP-91WM-EF6S', client: 'Client 137', email: 'client137@example.com' },
  { code: 'COMP-QWZ4-B3WI', client: 'Client 138', email: 'client138@example.com' },
  { code: 'COMP-PZLV-ETA9', client: 'Client 139', email: 'client139@example.com' },
  { code: 'COMP-RKXK-UMUV', client: 'Client 140', email: 'client140@example.com' },
  { code: 'COMP-PGP3-BVK9', client: 'Client 141', email: 'client141@example.com' },
  { code: 'COMP-HZJP-350N', client: 'Client 142', email: 'client142@example.com' },
  { code: 'COMP-RH1D-AHVH', client: 'Client 143', email: 'client143@example.com' },
  { code: 'COMP-YVB6-546G', client: 'Client 144', email: 'client144@example.com' },
  { code: 'COMP-PZUE-1Q2J', client: 'Client 145', email: 'client145@example.com' },
  { code: 'COMP-AL5Q-FGKZ', client: 'Client 146', email: 'client146@example.com' },
  { code: 'COMP-OC5Z-1UAM', client: 'Client 147', email: 'client147@example.com' },
  { code: 'COMP-E3FZ-1TMI', client: 'Client 148', email: 'client148@example.com' },
  { code: 'COMP-SKMX-A94W', client: 'Client 149', email: 'client149@example.com' },
  { code: 'COMP-VW9X-2I2W', client: 'Client 150', email: 'client150@example.com' },
  { code: 'COMP-QNBC-WMT1', client: 'Client 151', email: 'client151@example.com' },
  { code: 'COMP-IYT0-GJ1N', client: 'Client 152', email: 'client152@example.com' },
  { code: 'COMP-LBX8-08UZ', client: 'Client 153', email: 'client153@example.com' },
  { code: 'COMP-6SPH-93NQ', client: 'Client 154', email: 'client154@example.com' },
  { code: 'COMP-83P9-U4PT', client: 'Client 155', email: 'client155@example.com' },
  { code: 'COMP-93AF-ER6P', client: 'Client 156', email: 'client156@example.com' },
  { code: 'COMP-HLS4-UOWE', client: 'Client 157', email: 'client157@example.com' },
  { code: 'COMP-S6VW-TA53', client: 'Client 158', email: 'client158@example.com' },
  { code: 'COMP-T9U0-7MBF', client: 'Client 159', email: 'client159@example.com' },
  { code: 'COMP-MRX1-SI5Z', client: 'Client 160', email: 'client160@example.com' },
  { code: 'COMP-HZ29-IAZK', client: 'Client 161', email: 'client161@example.com' },
  { code: 'COMP-TOU2-2PGZ', client: 'Client 162', email: 'client162@example.com' },
  { code: 'COMP-BKW6-JG0J', client: 'Client 163', email: 'client163@example.com' },
  { code: 'COMP-0KZC-M5HH', client: 'Client 164', email: 'client164@example.com' },
  { code: 'COMP-BV0W-ZSIB', client: 'Client 165', email: 'client165@example.com' },
  { code: 'COMP-BD7R-QT66', client: 'Client 166', email: 'client166@example.com' },
  { code: 'COMP-FYZA-3Z5L', client: 'Client 167', email: 'client167@example.com' },
  { code: 'COMP-CQT0-IX6Q', client: 'Client 168', email: 'client168@example.com' },
  { code: 'COMP-AYE4-PC8I', client: 'Client 169', email: 'client169@example.com' },
  { code: 'COMP-19PL-UU63', client: 'Client 170', email: 'client170@example.com' },
  { code: 'COMP-Y6PN-MFOJ', client: 'Client 171', email: 'client171@example.com' },
  { code: 'COMP-WI2Z-4FXM', client: 'Client 172', email: 'client172@example.com' },
  { code: 'COMP-H6MZ-QWUI', client: 'Client 173', email: 'client173@example.com' },
  { code: 'COMP-Q4O1-N204', client: 'Client 174', email: 'client174@example.com' },
  { code: 'COMP-QY24-OWTK', client: 'Client 175', email: 'client175@example.com' },
  { code: 'COMP-MSM5-V1NV', client: 'Client 176', email: 'client176@example.com' },
  { code: 'COMP-94DS-T5W2', client: 'Client 177', email: 'client177@example.com' },
  { code: 'COMP-E3WJ-58U8', client: 'Client 178', email: 'client178@example.com' },
  { code: 'COMP-D4MC-T525', client: 'Client 179', email: 'client179@example.com' },
  { code: 'COMP-FQFL-ID2D', client: 'Client 180', email: 'client180@example.com' },
  { code: 'COMP-A9Y4-S2YU', client: 'Client 181', email: 'client181@example.com' },
  { code: 'COMP-7WUZ-4JKF', client: 'Client 182', email: 'client182@example.com' },
  { code: 'COMP-H8RA-4CFU', client: 'Client 183', email: 'client183@example.com' },
  { code: 'COMP-1E0Z-U3G5', client: 'Client 184', email: 'client184@example.com' },
  { code: 'COMP-4OFZ-JBSX', client: 'Client 185', email: 'client185@example.com' },
  { code: 'COMP-OD7D-T3I5', client: 'Client 186', email: 'client186@example.com' },
  { code: 'COMP-L3XQ-2SB2', client: 'Client 187', email: 'client187@example.com' },
  { code: 'COMP-BZPD-642Z', client: 'Client 188', email: 'client188@example.com' },
  { code: 'COMP-V1CY-2Q1L', client: 'Client 189', email: 'client189@example.com' },
  { code: 'COMP-KI8W-FR4R', client: 'Client 190', email: 'client190@example.com' },
  { code: 'COMP-U3FW-8O09', client: 'Client 191', email: 'client191@example.com' },
  { code: 'COMP-G23R-LU6R', client: 'Client 192', email: 'client192@example.com' },
  { code: 'COMP-3HAG-OJ3G', client: 'Client 193', email: 'client193@example.com' },
  { code: 'COMP-TL5F-84UA', client: 'Client 194', email: 'client194@example.com' },
  { code: 'COMP-482O-VIGW', client: 'Client 195', email: 'client195@example.com' },
  { code: 'COMP-946A-JW13', client: 'Client 196', email: 'client196@example.com' },
  { code: 'COMP-LLVS-MSFF', client: 'Client 197', email: 'client197@example.com' },
  { code: 'COMP-6AX8-OBCZ', client: 'Client 198', email: 'client198@example.com' },
  { code: 'COMP-O71L-Z7ZX', client: 'Client 199', email: 'client199@example.com' },
  { code: 'COMP-6EKY-VEVJ', client: 'Client 200', email: 'client200@example.com' },
];

const USERNAMES = [
  'ForexKing_99', 'PipHunter', 'TrendRider', 'ScalpMaster', 'BullRun_Trader',
  'ChartWizard', 'SwingPro', 'MarginCall_Mike', 'GreenPips', 'RiskManager',
  'BreakoutBoss', 'CandleKing', 'FiboTrader', 'MACD_Master', 'RSI_Warrior',
  'VolatilityVixen', 'RangeTrader', 'NewsTrader_Jay', 'CarryTrade_Chris', 'AlgoTrader_X',
];

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development' && process.env.SEED_SECRET !== request.headers.get('x-seed-secret')) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    // Always ensure all license codes exist (upsert)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    for (const lc of LICENSE_CODES) {
      await db.licenseCode.upsert({
        where: { code: lc.code },
        update: { status: 'active', expiresAt: new Date(Date.now() + thirtyDays) },
        create: {
          code: lc.code,
          clientName: lc.client,
          email: lc.email,
          status: 'active',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + thirtyDays),
        },
      });
    }

    // Skip full reseed if competitions already exist
    const existingComp = await db.competition.count();
    if (existingComp > 0) {
      const comps = await db.competition.findMany({ include: { _count: { select: { competitors: true } } }, orderBy: { createdAt: 'desc' } });
      const active = comps.find(c => c.status === 'active') || comps[0];
      return NextResponse.json({ message: 'Codes synced', competitionId: active?.id, licenseCodes: LICENSE_CODES.length, skipped: true });
    }

    // ── Create Seasons (each 2 weeks) ────────────────────────────
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;
    const seasonNames = [
      'Forex Rush — Season 1',
      'Forex Rush — Season 2',
      'Forex Rush — Season 3',
      'Forex Rush — Season 4',
      'Forex Rush — Season 5',
      'Forex Rush — Season 6',
    ];
    const seasonMonths = ['July', 'August', 'August', 'September', 'September', 'October'];

    const competitions = [];
    for (let i = 0; i < seasonNames.length; i++) {
      const start = new Date(Date.now() + i * twoWeeks);
      const end = new Date(start.getTime() + twoWeeks);
      const comp = await db.competition.create({
        data: {
          title: seasonNames[i],
          description: `${seasonMonths[i]} showdown — 2-week forex trading competition. $10,000 virtual balance. Climb the leaderboard to win.`,
          entryFee: 10.0,
          prizePool: 0,
          startDate: start,
          endDate: end,
          status: i === 0 ? 'active' : 'upcoming',
          maxParticipants: 500,
        },
      });
      competitions.push(comp);
    }
    const competition = competitions[0];

    // Create demo competitors (without license codes — they're simulated traders)
    const shuffled = [...USERNAMES].sort(() => Math.random() - 0.5).slice(0, 20);

    const competitors = await Promise.all(
      shuffled.map((username, index) => {
        const totalPnl = Math.round((Math.random() * 6000 - 1500 + (20 - index) * 200) * 100) / 100;
        const totalTrades = Math.floor(Math.random() * 80) + 10;
        const wins = Math.floor(totalTrades * (0.35 + Math.random() * 0.4));
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const currentBalance = 10000 + totalPnl;

        return db.competitor.create({
          data: {
            competitionId: competition.id,
            username,
            displayName: username,
            avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${username}`,
            initialBalance: 10000.0,
            currentBalance: parseFloat(currentBalance.toFixed(2)),
            totalPnl,
            totalTrades,
            winRate: parseFloat(winRate.toFixed(2)),
          },
        });
      })
    );

    // Create trades for each competitor
    for (const competitor of competitors) {
      const numTrades = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numTrades; i++) {
        const pair = FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)];
        const direction = Math.random() > 0.5 ? 'long' : 'short';
        const lotSize = parseFloat((Math.random() * 1.5 + 0.1).toFixed(2));
        const basePrice = FOREX_PRICES[pair];
        const isJpy = pair.includes('JPY');
        const entryPrice = parseFloat((basePrice + (Math.random() - 0.5) * basePrice * 0.002).toFixed(isJpy ? 2 : 4));
        const pipValue = isJpy ? 0.01 : 0.0001;
        const pipsRange = Math.random() * 60 - 20;
        const exitPrice = parseFloat((direction === 'long'
          ? entryPrice + pipsRange * pipValue
          : entryPrice - pipsRange * pipValue
        ).toFixed(isJpy ? 2 : 4));
        const pips = direction === 'long'
          ? (exitPrice - entryPrice) / pipValue
          : (entryPrice - exitPrice) / pipValue;
        const pnl = parseFloat((pips * lotSize * (isJpy ? 6.67 : 10)).toFixed(2));
        const openedAt = new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000);
        const closedAt = new Date(openedAt.getTime() + Math.random() * 4 * 60 * 60 * 1000);

        await db.trade.create({
          data: {
            competitorId: competitor.id,
            competitionId: competition.id,
            pair, direction, lotSize, entryPrice, exitPrice, pnl,
            status: 'closed', openedAt, closedAt,
          },
        });
      }
    }

    // Recalculate demo competitor stats from actual trades
    for (const comp of competitors) {
      const trades = await db.trade.findMany({ where: { competitorId: comp.id, status: 'closed' } });
      const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
      const totalTrades = trades.length;
      const wins = trades.filter(t => t.pnl > 0).length;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      await db.competitor.update({
        where: { id: comp.id },
        data: { totalPnl, totalTrades, winRate, currentBalance: 10000 + totalPnl },
      });
    }

    // Update prize pool
    const totalParticipants = competitors.length;
    await db.competition.update({
      where: { id: competition.id },
      data: { prizePool: totalParticipants * 10 },
    });

    return NextResponse.json({
      message: 'Database seeded',
      competitionId: competition.id,
      competitors: totalParticipants,
      licenseCodes: LICENSE_CODES.length,
    });
  } catch (error) {
    console.error('Error seeding:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}