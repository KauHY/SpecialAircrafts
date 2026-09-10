import unittest

from collect_xmyzl import Page, extract


class LiveryParserTests(unittest.TestCase):
    def parse(self, body):
        return extract(Page('<p>当前机队彩绘/特别涂装飞机情况（2）：<br>' + body + '</p>'))

    def test_multiple_registrations_and_notes(self):
        records, _, warnings = self.parse('牡丹号：B-5198(黄)、B-5211(红)<br>近期机队消息：<br>新机：B-9999')
        self.assertEqual([(r['registration'], r['name']) for r in records], [('B-5198', '牡丹号(黄)'), ('B-5211', '牡丹号(红)')])
        self.assertEqual(warnings, [])

    def test_registration_first(self):
        records, _, warnings = self.parse('B-1151 千里江山-携程旅行<br>B-20AD 创意版标准机')
        self.assertEqual(records[0]['name'], '千里江山-携程旅行')
        self.assertEqual(records[1]['registration'], 'B-20AD')
        self.assertEqual(warnings, [])

    def test_delivery_commemorative_name_and_exclusion(self):
        records, _, warnings = self.parse('波音交付中国第2000架 B-1136<br>第一架在中国交付A350：B-323H<br>不包括：787机队统一涂装')
        self.assertEqual(len(records), 2)
        self.assertEqual(warnings, [])

    def test_news_and_fleet_table_not_used(self):
        records, sections, _ = extract(Page('<p>近期机队消息：彩绘B-1234</p><p>机队列表：B-5678</p>'))
        self.assertEqual((records, sections), ([], []))
        records, _, _ = self.parse('特别号：B-1234<br>退役记录<br>纪念号：B-5678')
        self.assertEqual(len(records), 1)

    def test_unknown_rows_require_review(self):
        _, _, warnings = self.parse('未知格式ABC123')
        self.assertTrue(warnings)

    def test_entity_and_unicode_hyphen(self):
        records, _, _ = self.parse('主题&nbsp;号：b－308m、B-16205')
        self.assertEqual([r['registration'] for r in records], ['B-308M', 'B-16205'])


if __name__ == '__main__':
    unittest.main()
