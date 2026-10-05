// 賽爾號屬性資料與克制矩陣（自動生成自 Seer_Type_Chart.xlsx 與 SeerAPI）
export const SEER_TYPE_DATA = {
  "singleTypes": [
    "草",
    "水",
    "火",
    "飛行",
    "電",
    "機械",
    "地面",
    "普通",
    "冰",
    "超能",
    "戰鬥",
    "光",
    "暗影",
    "神秘",
    "龍",
    "聖靈",
    "次元",
    "遠古",
    "邪靈",
    "自然",
    "王",
    "混沌",
    "神靈",
    "輪迴",
    "蟲",
    "虛空"
  ],
  "singleRelations": {
    "草": {
      "eff_2x": [
        "水",
        "地面",
        "光"
      ],
      "eff_05x": [
        "草",
        "火",
        "飛行",
        "機械",
        "聖靈",
        "遠古",
        "混沌",
        "神靈"
      ],
      "eff_0x": []
    },
    "水": {
      "eff_2x": [
        "火",
        "地面"
      ],
      "eff_05x": [
        "草",
        "水",
        "聖靈",
        "自然",
        "混沌",
        "神靈"
      ],
      "eff_0x": []
    },
    "火": {
      "eff_2x": [
        "草",
        "機械",
        "冰"
      ],
      "eff_05x": [
        "水",
        "火",
        "聖靈",
        "自然",
        "混沌",
        "神靈"
      ],
      "eff_0x": []
    },
    "飛行": {
      "eff_2x": [
        "草",
        "戰鬥",
        "蟲"
      ],
      "eff_05x": [
        "電",
        "機械",
        "次元",
        "邪靈",
        "自然",
        "混沌"
      ],
      "eff_0x": []
    },
    "電": {
      "eff_2x": [
        "水",
        "飛行",
        "暗影",
        "次元",
        "混沌",
        "虛空"
      ],
      "eff_05x": [
        "草",
        "電",
        "神秘",
        "聖靈",
        "自然",
        "神靈"
      ],
      "eff_0x": [
        "地面"
      ]
    },
    "機械": {
      "eff_2x": [
        "冰",
        "戰鬥",
        "遠古",
        "邪靈",
        "神靈"
      ],
      "eff_05x": [
        "水",
        "火",
        "電",
        "機械",
        "次元"
      ],
      "eff_0x": []
    },
    "地面": {
      "eff_2x": [
        "火",
        "電",
        "機械",
        "王",
        "輪迴"
      ],
      "eff_05x": [
        "草",
        "超能",
        "暗影",
        "龍",
        "聖靈",
        "自然",
        "神靈",
        "蟲"
      ],
      "eff_0x": [
        "飛行"
      ]
    },
    "普通": {
      "eff_2x": [],
      "eff_05x": [],
      "eff_0x": []
    },
    "冰": {
      "eff_2x": [
        "草",
        "飛行",
        "地面",
        "次元",
        "遠古",
        "輪迴",
        "蟲"
      ],
      "eff_05x": [
        "水",
        "火",
        "機械",
        "冰",
        "聖靈",
        "混沌",
        "神靈"
      ],
      "eff_0x": []
    },
    "超能": {
      "eff_2x": [
        "戰鬥",
        "神秘",
        "自然"
      ],
      "eff_05x": [
        "機械",
        "超能",
        "蟲"
      ],
      "eff_0x": [
        "光"
      ]
    },
    "戰鬥": {
      "eff_2x": [
        "機械",
        "冰",
        "龍",
        "聖靈"
      ],
      "eff_05x": [
        "超能",
        "戰鬥",
        "暗影",
        "邪靈",
        "王"
      ],
      "eff_0x": []
    },
    "光": {
      "eff_2x": [
        "超能",
        "暗影",
        "蟲"
      ],
      "eff_05x": [
        "機械",
        "冰",
        "光",
        "聖靈",
        "邪靈",
        "自然",
        "神靈",
        "輪迴",
        "虛空"
      ],
      "eff_0x": [
        "草"
      ]
    },
    "暗影": {
      "eff_2x": [
        "超能",
        "暗影",
        "次元"
      ],
      "eff_05x": [
        "機械",
        "冰",
        "光",
        "聖靈",
        "邪靈",
        "神靈"
      ],
      "eff_0x": []
    },
    "神秘": {
      "eff_2x": [
        "電",
        "神秘",
        "聖靈",
        "自然",
        "王",
        "神靈",
        "輪迴"
      ],
      "eff_05x": [
        "地面",
        "戰鬥",
        "邪靈",
        "混沌",
        "蟲"
      ],
      "eff_0x": []
    },
    "龍": {
      "eff_2x": [
        "冰",
        "龍",
        "聖靈",
        "邪靈"
      ],
      "eff_05x": [
        "草",
        "水",
        "火",
        "電",
        "遠古",
        "蟲"
      ],
      "eff_0x": []
    },
    "聖靈": {
      "eff_2x": [
        "草",
        "水",
        "火",
        "電",
        "冰",
        "遠古",
        "虛空"
      ],
      "eff_05x": [
        "戰鬥",
        "神秘",
        "龍",
        "輪迴"
      ],
      "eff_0x": []
    },
    "次元": {
      "eff_2x": [
        "飛行",
        "機械",
        "超能",
        "邪靈",
        "自然",
        "蟲",
        "虛空"
      ],
      "eff_05x": [
        "冰",
        "王",
        "混沌",
        "邪靈",
        "輪迴"
      ],
      "eff_0x": [
        "暗影"
      ]
    },
    "遠古": {
      "eff_2x": [
        "草",
        "飛行",
        "神秘",
        "龍",
        "虛空"
      ],
      "eff_05x": [
        "機械",
        "冰",
        "王",
        "輪迴"
      ],
      "eff_0x": []
    },
    "邪靈": {
      "eff_2x": [
        "光",
        "暗影",
        "神秘",
        "次元",
        "自然"
      ],
      "eff_05x": [
        "機械",
        "冰",
        "超能",
        "聖靈",
        "王",
        "混沌",
        "輪迴"
      ],
      "eff_0x": [
        "神靈"
      ]
    },
    "自然": {
      "eff_2x": [
        "草",
        "水",
        "火",
        "飛行",
        "電",
        "地面",
        "光",
        "王",
        "輪迴"
      ],
      "eff_05x": [
        "機械",
        "超能",
        "戰鬥",
        "暗影",
        "神秘",
        "次元",
        "邪靈",
        "混沌",
        "虛空"
      ],
      "eff_0x": []
    },
    "王": {
      "eff_2x": [
        "戰鬥",
        "暗影",
        "次元",
        "邪靈"
      ],
      "eff_05x": [
        "超能",
        "自然",
        "蟲"
      ],
      "eff_0x": []
    },
    "混沌": {
      "eff_2x": [
        "飛行",
        "冰",
        "神秘",
        "次元",
        "邪靈",
        "自然",
        "神靈"
      ],
      "eff_05x": [
        "電",
        "機械",
        "戰鬥",
        "輪迴"
      ],
      "eff_0x": [
        "虛空"
      ]
    },
    "神靈": {
      "eff_2x": [
        "草",
        "水",
        "火",
        "電",
        "冰",
        "遠古",
        "邪靈",
        "混沌"
      ],
      "eff_05x": [
        "機械",
        "戰鬥",
        "龍"
      ],
      "eff_0x": []
    },
    "輪迴": {
      "eff_2x": [
        "光",
        "暗影",
        "聖靈",
        "次元",
        "邪靈",
        "混沌"
      ],
      "eff_05x": [
        "冰",
        "超能",
        "自然",
        "虛空"
      ],
      "eff_0x": []
    },
    "蟲": {
      "eff_2x": [
        "草",
        "地面",
        "戰鬥",
        "混沌",
        "蟲"
      ],
      "eff_05x": [
        "水",
        "火",
        "冰",
        "光"
      ],
      "eff_0x": []
    },
    "虛空": {
      "eff_2x": [
        "超能",
        "戰鬥",
        "光",
        "神秘",
        "自然",
        "輪迴"
      ],
      "eff_05x": [
        "飛行",
        "暗影",
        "聖靈",
        "次元"
      ],
      "eff_0x": []
    }
  },
  "combinations": [
    {
      "id": 1,
      "name": "草",
      "isDouble": false,
      "primary": "草",
      "secondary": null,
      "types": [
        "草"
      ]
    },
    {
      "id": 2,
      "name": "水",
      "isDouble": false,
      "primary": "水",
      "secondary": null,
      "types": [
        "水"
      ]
    },
    {
      "id": 3,
      "name": "火",
      "isDouble": false,
      "primary": "火",
      "secondary": null,
      "types": [
        "火"
      ]
    },
    {
      "id": 4,
      "name": "飛行",
      "isDouble": false,
      "primary": "飛行",
      "secondary": null,
      "types": [
        "飛行"
      ]
    },
    {
      "id": 5,
      "name": "電",
      "isDouble": false,
      "primary": "電",
      "secondary": null,
      "types": [
        "電"
      ]
    },
    {
      "id": 6,
      "name": "機械",
      "isDouble": false,
      "primary": "機械",
      "secondary": null,
      "types": [
        "機械"
      ]
    },
    {
      "id": 7,
      "name": "地面",
      "isDouble": false,
      "primary": "地面",
      "secondary": null,
      "types": [
        "地面"
      ]
    },
    {
      "id": 8,
      "name": "普通",
      "isDouble": false,
      "primary": "普通",
      "secondary": null,
      "types": [
        "普通"
      ]
    },
    {
      "id": 9,
      "name": "冰",
      "isDouble": false,
      "primary": "冰",
      "secondary": null,
      "types": [
        "冰"
      ]
    },
    {
      "id": 10,
      "name": "超能",
      "isDouble": false,
      "primary": "超能",
      "secondary": null,
      "types": [
        "超能"
      ]
    },
    {
      "id": 11,
      "name": "戰鬥",
      "isDouble": false,
      "primary": "戰鬥",
      "secondary": null,
      "types": [
        "戰鬥"
      ]
    },
    {
      "id": 12,
      "name": "光",
      "isDouble": false,
      "primary": "光",
      "secondary": null,
      "types": [
        "光"
      ]
    },
    {
      "id": 13,
      "name": "暗影",
      "isDouble": false,
      "primary": "暗影",
      "secondary": null,
      "types": [
        "暗影"
      ]
    },
    {
      "id": 14,
      "name": "神秘",
      "isDouble": false,
      "primary": "神秘",
      "secondary": null,
      "types": [
        "神秘"
      ]
    },
    {
      "id": 15,
      "name": "龍",
      "isDouble": false,
      "primary": "龍",
      "secondary": null,
      "types": [
        "龍"
      ]
    },
    {
      "id": 16,
      "name": "聖靈",
      "isDouble": false,
      "primary": "聖靈",
      "secondary": null,
      "types": [
        "聖靈"
      ]
    },
    {
      "id": 17,
      "name": "次元",
      "isDouble": false,
      "primary": "次元",
      "secondary": null,
      "types": [
        "次元"
      ]
    },
    {
      "id": 18,
      "name": "遠古",
      "isDouble": false,
      "primary": "遠古",
      "secondary": null,
      "types": [
        "遠古"
      ]
    },
    {
      "id": 19,
      "name": "邪靈",
      "isDouble": false,
      "primary": "邪靈",
      "secondary": null,
      "types": [
        "邪靈"
      ]
    },
    {
      "id": 20,
      "name": "自然",
      "isDouble": false,
      "primary": "自然",
      "secondary": null,
      "types": [
        "自然"
      ]
    },
    {
      "id": 21,
      "name": "草 超能",
      "isDouble": true,
      "primary": "草",
      "secondary": "超能",
      "types": [
        "草",
        "超能"
      ]
    },
    {
      "id": 22,
      "name": "草 戰鬥",
      "isDouble": true,
      "primary": "草",
      "secondary": "戰鬥",
      "types": [
        "草",
        "戰鬥"
      ]
    },
    {
      "id": 23,
      "name": "草 暗影",
      "isDouble": true,
      "primary": "草",
      "secondary": "暗影",
      "types": [
        "草",
        "暗影"
      ]
    },
    {
      "id": 24,
      "name": "水 超能",
      "isDouble": true,
      "primary": "水",
      "secondary": "超能",
      "types": [
        "水",
        "超能"
      ]
    },
    {
      "id": 25,
      "name": "水 暗影",
      "isDouble": true,
      "primary": "水",
      "secondary": "暗影",
      "types": [
        "水",
        "暗影"
      ]
    },
    {
      "id": 26,
      "name": "水 龍",
      "isDouble": true,
      "primary": "水",
      "secondary": "龍",
      "types": [
        "水",
        "龍"
      ]
    },
    {
      "id": 27,
      "name": "火 飛行",
      "isDouble": true,
      "primary": "火",
      "secondary": "飛行",
      "types": [
        "火",
        "飛行"
      ]
    },
    {
      "id": 28,
      "name": "火 龍",
      "isDouble": true,
      "primary": "火",
      "secondary": "龍",
      "types": [
        "火",
        "龍"
      ]
    },
    {
      "id": 29,
      "name": "火 超能",
      "isDouble": true,
      "primary": "火",
      "secondary": "超能",
      "types": [
        "火",
        "超能"
      ]
    },
    {
      "id": 30,
      "name": "飛行 超能",
      "isDouble": true,
      "primary": "飛行",
      "secondary": "超能",
      "types": [
        "飛行",
        "超能"
      ]
    },
    {
      "id": 31,
      "name": "光 飛行",
      "isDouble": true,
      "primary": "光",
      "secondary": "飛行",
      "types": [
        "光",
        "飛行"
      ]
    },
    {
      "id": 32,
      "name": "飛行 龍",
      "isDouble": true,
      "primary": "飛行",
      "secondary": "龍",
      "types": [
        "飛行",
        "龍"
      ]
    },
    {
      "id": 33,
      "name": "電 火",
      "isDouble": true,
      "primary": "電",
      "secondary": "火",
      "types": [
        "電",
        "火"
      ]
    },
    {
      "id": 34,
      "name": "電 冰",
      "isDouble": true,
      "primary": "電",
      "secondary": "冰",
      "types": [
        "電",
        "冰"
      ]
    },
    {
      "id": 35,
      "name": "電 戰鬥",
      "isDouble": true,
      "primary": "電",
      "secondary": "戰鬥",
      "types": [
        "電",
        "戰鬥"
      ]
    },
    {
      "id": 36,
      "name": "暗影 電",
      "isDouble": true,
      "primary": "暗影",
      "secondary": "電",
      "types": [
        "暗影",
        "電"
      ]
    },
    {
      "id": 37,
      "name": "機械 地面",
      "isDouble": true,
      "primary": "機械",
      "secondary": "地面",
      "types": [
        "機械",
        "地面"
      ]
    },
    {
      "id": 38,
      "name": "機械 超能",
      "isDouble": true,
      "primary": "機械",
      "secondary": "超能",
      "types": [
        "機械",
        "超能"
      ]
    },
    {
      "id": 39,
      "name": "機械 龍",
      "isDouble": true,
      "primary": "機械",
      "secondary": "龍",
      "types": [
        "機械",
        "龍"
      ]
    },
    {
      "id": 40,
      "name": "地面 龍",
      "isDouble": true,
      "primary": "地面",
      "secondary": "龍",
      "types": [
        "地面",
        "龍"
      ]
    },
    {
      "id": 41,
      "name": "戰鬥 地面",
      "isDouble": true,
      "primary": "戰鬥",
      "secondary": "地面",
      "types": [
        "戰鬥",
        "地面"
      ]
    },
    {
      "id": 42,
      "name": "地面 暗影",
      "isDouble": true,
      "primary": "地面",
      "secondary": "暗影",
      "types": [
        "地面",
        "暗影"
      ]
    },
    {
      "id": 43,
      "name": "冰 龍",
      "isDouble": true,
      "primary": "冰",
      "secondary": "龍",
      "types": [
        "冰",
        "龍"
      ]
    },
    {
      "id": 44,
      "name": "冰 光",
      "isDouble": true,
      "primary": "冰",
      "secondary": "光",
      "types": [
        "冰",
        "光"
      ]
    },
    {
      "id": 45,
      "name": "冰 暗影",
      "isDouble": true,
      "primary": "冰",
      "secondary": "暗影",
      "types": [
        "冰",
        "暗影"
      ]
    },
    {
      "id": 46,
      "name": "超能 冰",
      "isDouble": true,
      "primary": "超能",
      "secondary": "冰",
      "types": [
        "超能",
        "冰"
      ]
    },
    {
      "id": 47,
      "name": "戰鬥 火",
      "isDouble": true,
      "primary": "戰鬥",
      "secondary": "火",
      "types": [
        "戰鬥",
        "火"
      ]
    },
    {
      "id": 48,
      "name": "戰鬥 暗影",
      "isDouble": true,
      "primary": "戰鬥",
      "secondary": "暗影",
      "types": [
        "戰鬥",
        "暗影"
      ]
    },
    {
      "id": 49,
      "name": "光 神秘",
      "isDouble": true,
      "primary": "光",
      "secondary": "神秘",
      "types": [
        "光",
        "神秘"
      ]
    },
    {
      "id": 50,
      "name": "暗影 神秘",
      "isDouble": true,
      "primary": "暗影",
      "secondary": "神秘",
      "types": [
        "暗影",
        "神秘"
      ]
    },
    {
      "id": 51,
      "name": "神秘 超能",
      "isDouble": true,
      "primary": "神秘",
      "secondary": "超能",
      "types": [
        "神秘",
        "超能"
      ]
    },
    {
      "id": 52,
      "name": "聖靈 光",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "光",
      "types": [
        "聖靈",
        "光"
      ]
    },
    {
      "id": 53,
      "name": "飛行 神秘",
      "isDouble": true,
      "primary": "飛行",
      "secondary": "神秘",
      "types": [
        "飛行",
        "神秘"
      ]
    },
    {
      "id": 54,
      "name": "地面 超能",
      "isDouble": true,
      "primary": "地面",
      "secondary": "超能",
      "types": [
        "地面",
        "超能"
      ]
    },
    {
      "id": 55,
      "name": "暗影 龍",
      "isDouble": true,
      "primary": "暗影",
      "secondary": "龍",
      "types": [
        "暗影",
        "龍"
      ]
    },
    {
      "id": 56,
      "name": "聖靈 暗影",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "暗影",
      "types": [
        "聖靈",
        "暗影"
      ]
    },
    {
      "id": 57,
      "name": "遠古 戰鬥",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "戰鬥",
      "types": [
        "遠古",
        "戰鬥"
      ]
    },
    {
      "id": 58,
      "name": "火 神秘",
      "isDouble": true,
      "primary": "火",
      "secondary": "神秘",
      "types": [
        "火",
        "神秘"
      ]
    },
    {
      "id": 59,
      "name": "光 戰鬥",
      "isDouble": true,
      "primary": "光",
      "secondary": "戰鬥",
      "types": [
        "光",
        "戰鬥"
      ]
    },
    {
      "id": 60,
      "name": "神秘 戰鬥",
      "isDouble": true,
      "primary": "神秘",
      "secondary": "戰鬥",
      "types": [
        "神秘",
        "戰鬥"
      ]
    },
    {
      "id": 61,
      "name": "次元 戰鬥",
      "isDouble": true,
      "primary": "次元",
      "secondary": "戰鬥",
      "types": [
        "次元",
        "戰鬥"
      ]
    },
    {
      "id": 62,
      "name": "邪靈 神秘",
      "isDouble": true,
      "primary": "邪靈",
      "secondary": "神秘",
      "types": [
        "邪靈",
        "神秘"
      ]
    },
    {
      "id": 63,
      "name": "遠古 龍",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "龍",
      "types": [
        "遠古",
        "龍"
      ]
    },
    {
      "id": 64,
      "name": "光 次元",
      "isDouble": true,
      "primary": "光",
      "secondary": "次元",
      "types": [
        "光",
        "次元"
      ]
    },
    {
      "id": 65,
      "name": "遠古 聖靈",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "聖靈",
      "types": [
        "遠古",
        "聖靈"
      ]
    },
    {
      "id": 66,
      "name": "水 戰鬥",
      "isDouble": true,
      "primary": "水",
      "secondary": "戰鬥",
      "types": [
        "水",
        "戰鬥"
      ]
    },
    {
      "id": 67,
      "name": "電 龍",
      "isDouble": true,
      "primary": "電",
      "secondary": "龍",
      "types": [
        "電",
        "龍"
      ]
    },
    {
      "id": 68,
      "name": "光 火",
      "isDouble": true,
      "primary": "光",
      "secondary": "火",
      "types": [
        "光",
        "火"
      ]
    },
    {
      "id": 69,
      "name": "光 暗影",
      "isDouble": true,
      "primary": "光",
      "secondary": "暗影",
      "types": [
        "光",
        "暗影"
      ]
    },
    {
      "id": 70,
      "name": "邪靈 龍",
      "isDouble": true,
      "primary": "邪靈",
      "secondary": "龍",
      "types": [
        "邪靈",
        "龍"
      ]
    },
    {
      "id": 71,
      "name": "遠古 神秘",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "神秘",
      "types": [
        "遠古",
        "神秘"
      ]
    },
    {
      "id": 72,
      "name": "機械 次元",
      "isDouble": true,
      "primary": "機械",
      "secondary": "次元",
      "types": [
        "機械",
        "次元"
      ]
    },
    {
      "id": 73,
      "name": "戰鬥 龍",
      "isDouble": true,
      "primary": "戰鬥",
      "secondary": "龍",
      "types": [
        "戰鬥",
        "龍"
      ]
    },
    {
      "id": 74,
      "name": "戰鬥 自然",
      "isDouble": true,
      "primary": "戰鬥",
      "secondary": "自然",
      "types": [
        "戰鬥",
        "自然"
      ]
    },
    {
      "id": 75,
      "name": "邪靈 機械",
      "isDouble": true,
      "primary": "邪靈",
      "secondary": "機械",
      "types": [
        "邪靈",
        "機械"
      ]
    },
    {
      "id": 76,
      "name": "電 次元",
      "isDouble": true,
      "primary": "電",
      "secondary": "次元",
      "types": [
        "電",
        "次元"
      ]
    },
    {
      "id": 77,
      "name": "遠古 火",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "火",
      "types": [
        "遠古",
        "火"
      ]
    },
    {
      "id": 78,
      "name": "聖靈 戰鬥",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "戰鬥",
      "types": [
        "聖靈",
        "戰鬥"
      ]
    },
    {
      "id": 79,
      "name": "聖靈 次元",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "次元",
      "types": [
        "聖靈",
        "次元"
      ]
    },
    {
      "id": 80,
      "name": "聖靈 電",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "電",
      "types": [
        "聖靈",
        "電"
      ]
    },
    {
      "id": 81,
      "name": "遠古 地面",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "地面",
      "types": [
        "遠古",
        "地面"
      ]
    },
    {
      "id": 82,
      "name": "遠古 草",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "草",
      "types": [
        "遠古",
        "草"
      ]
    },
    {
      "id": 83,
      "name": "自然 龍",
      "isDouble": true,
      "primary": "自然",
      "secondary": "龍",
      "types": [
        "自然",
        "龍"
      ]
    },
    {
      "id": 84,
      "name": "冰 神秘",
      "isDouble": true,
      "primary": "冰",
      "secondary": "神秘",
      "types": [
        "冰",
        "神秘"
      ]
    },
    {
      "id": 85,
      "name": "飛行 暗影",
      "isDouble": true,
      "primary": "飛行",
      "secondary": "暗影",
      "types": [
        "飛行",
        "暗影"
      ]
    },
    {
      "id": 86,
      "name": "冰 火",
      "isDouble": true,
      "primary": "冰",
      "secondary": "火",
      "types": [
        "冰",
        "火"
      ]
    },
    {
      "id": 87,
      "name": "冰 飛行",
      "isDouble": true,
      "primary": "冰",
      "secondary": "飛行",
      "types": [
        "冰",
        "飛行"
      ]
    },
    {
      "id": 88,
      "name": "自然 聖靈",
      "isDouble": true,
      "primary": "自然",
      "secondary": "聖靈",
      "types": [
        "自然",
        "聖靈"
      ]
    },
    {
      "id": 89,
      "name": "混沌 聖靈",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "聖靈",
      "types": [
        "混沌",
        "聖靈"
      ]
    },
    {
      "id": 90,
      "name": "遠古 邪靈",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "邪靈",
      "types": [
        "遠古",
        "邪靈"
      ]
    },
    {
      "id": 91,
      "name": "自然 冰",
      "isDouble": true,
      "primary": "自然",
      "secondary": "冰",
      "types": [
        "自然",
        "冰"
      ]
    },
    {
      "id": 92,
      "name": "混沌 暗影",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "暗影",
      "types": [
        "混沌",
        "暗影"
      ]
    },
    {
      "id": 93,
      "name": "混沌 戰鬥",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "戰鬥",
      "types": [
        "混沌",
        "戰鬥"
      ]
    },
    {
      "id": 94,
      "name": "混沌 超能",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "超能",
      "types": [
        "混沌",
        "超能"
      ]
    },
    {
      "id": 95,
      "name": "聖靈 超能",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "超能",
      "types": [
        "聖靈",
        "超能"
      ]
    },
    {
      "id": 96,
      "name": "混沌 地面",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "地面",
      "types": [
        "混沌",
        "地面"
      ]
    },
    {
      "id": 97,
      "name": "暗影 邪靈",
      "isDouble": true,
      "primary": "暗影",
      "secondary": "邪靈",
      "types": [
        "暗影",
        "邪靈"
      ]
    },
    {
      "id": 98,
      "name": "混沌 遠古",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "遠古",
      "types": [
        "混沌",
        "遠古"
      ]
    },
    {
      "id": 99,
      "name": "混沌 邪靈",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "邪靈",
      "types": [
        "混沌",
        "邪靈"
      ]
    },
    {
      "id": 100,
      "name": "聖靈 地面",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "地面",
      "types": [
        "聖靈",
        "地面"
      ]
    },
    {
      "id": 101,
      "name": "火 暗影",
      "isDouble": true,
      "primary": "火",
      "secondary": "暗影",
      "types": [
        "火",
        "暗影"
      ]
    },
    {
      "id": 102,
      "name": "光 超能",
      "isDouble": true,
      "primary": "光",
      "secondary": "超能",
      "types": [
        "光",
        "超能"
      ]
    },
    {
      "id": 103,
      "name": "機械 戰鬥",
      "isDouble": true,
      "primary": "機械",
      "secondary": "戰鬥",
      "types": [
        "機械",
        "戰鬥"
      ]
    },
    {
      "id": 104,
      "name": "飛行 電",
      "isDouble": true,
      "primary": "飛行",
      "secondary": "電",
      "types": [
        "飛行",
        "電"
      ]
    },
    {
      "id": 105,
      "name": "混沌 飛行",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "飛行",
      "types": [
        "混沌",
        "飛行"
      ]
    },
    {
      "id": 106,
      "name": "混沌 龍",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "龍",
      "types": [
        "混沌",
        "龍"
      ]
    },
    {
      "id": 107,
      "name": "混沌 火",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "火",
      "types": [
        "混沌",
        "火"
      ]
    },
    {
      "id": 108,
      "name": "聖靈 火",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "火",
      "types": [
        "聖靈",
        "火"
      ]
    },
    {
      "id": 109,
      "name": "地面 神秘",
      "isDouble": true,
      "primary": "地面",
      "secondary": "神秘",
      "types": [
        "地面",
        "神秘"
      ]
    },
    {
      "id": 110,
      "name": "混沌 次元",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "次元",
      "types": [
        "混沌",
        "次元"
      ]
    },
    {
      "id": 111,
      "name": "混沌 冰",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "冰",
      "types": [
        "混沌",
        "冰"
      ]
    },
    {
      "id": 112,
      "name": "自然 神秘",
      "isDouble": true,
      "primary": "自然",
      "secondary": "神秘",
      "types": [
        "自然",
        "神秘"
      ]
    },
    {
      "id": 113,
      "name": "虛空 邪靈",
      "isDouble": true,
      "primary": "虛空",
      "secondary": "邪靈",
      "types": [
        "虛空",
        "邪靈"
      ]
    },
    {
      "id": 114,
      "name": "虛空 混沌",
      "isDouble": true,
      "primary": "虛空",
      "secondary": "混沌",
      "types": [
        "虛空",
        "混沌"
      ]
    },
    {
      "id": 115,
      "name": "聖靈 輪迴",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "輪迴",
      "types": [
        "聖靈",
        "輪迴"
      ]
    },
    {
      "id": 116,
      "name": "水 次元",
      "isDouble": true,
      "primary": "水",
      "secondary": "次元",
      "types": [
        "水",
        "次元"
      ]
    },
    {
      "id": 117,
      "name": "聖靈 神秘",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "神秘",
      "types": [
        "聖靈",
        "神秘"
      ]
    },
    {
      "id": 118,
      "name": "機械 神秘",
      "isDouble": true,
      "primary": "機械",
      "secondary": "神秘",
      "types": [
        "機械",
        "神秘"
      ]
    },
    {
      "id": 119,
      "name": "水 神秘",
      "isDouble": true,
      "primary": "水",
      "secondary": "神秘",
      "types": [
        "水",
        "神秘"
      ]
    },
    {
      "id": 120,
      "name": "次元 龍",
      "isDouble": true,
      "primary": "次元",
      "secondary": "龍",
      "types": [
        "次元",
        "龍"
      ]
    },
    {
      "id": 121,
      "name": "自然 超能",
      "isDouble": true,
      "primary": "自然",
      "secondary": "超能",
      "types": [
        "自然",
        "超能"
      ]
    },
    {
      "id": 122,
      "name": "電 機械",
      "isDouble": true,
      "primary": "電",
      "secondary": "機械",
      "types": [
        "電",
        "機械"
      ]
    },
    {
      "id": 123,
      "name": "神秘 輪迴",
      "isDouble": true,
      "primary": "神秘",
      "secondary": "輪迴",
      "types": [
        "神秘",
        "輪迴"
      ]
    },
    {
      "id": 124,
      "name": "水 機械",
      "isDouble": true,
      "primary": "水",
      "secondary": "機械",
      "types": [
        "水",
        "機械"
      ]
    },
    {
      "id": 125,
      "name": "火 機械",
      "isDouble": true,
      "primary": "火",
      "secondary": "機械",
      "types": [
        "火",
        "機械"
      ]
    },
    {
      "id": 126,
      "name": "草 機械",
      "isDouble": true,
      "primary": "草",
      "secondary": "機械",
      "types": [
        "草",
        "機械"
      ]
    },
    {
      "id": 127,
      "name": "遠古 電",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "電",
      "types": [
        "遠古",
        "電"
      ]
    },
    {
      "id": 128,
      "name": "聖靈 飛行",
      "isDouble": true,
      "primary": "聖靈",
      "secondary": "飛行",
      "types": [
        "聖靈",
        "飛行"
      ]
    },
    {
      "id": 129,
      "name": "遠古 機械",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "機械",
      "types": [
        "遠古",
        "機械"
      ]
    },
    {
      "id": 130,
      "name": "遠古 光",
      "isDouble": true,
      "primary": "遠古",
      "secondary": "光",
      "types": [
        "遠古",
        "光"
      ]
    },
    {
      "id": 131,
      "name": "混沌 光",
      "isDouble": true,
      "primary": "混沌",
      "secondary": "光",
      "types": [
        "混沌",
        "光"
      ]
    },
    {
      "id": 132,
      "name": "火 蟲",
      "isDouble": true,
      "primary": "火",
      "secondary": "蟲",
      "types": [
        "火",
        "蟲"
      ]
    },
    {
      "id": 221,
      "name": "王",
      "isDouble": false,
      "primary": "王",
      "secondary": null,
      "types": [
        "王"
      ]
    },
    {
      "id": 222,
      "name": "混沌",
      "isDouble": false,
      "primary": "混沌",
      "secondary": null,
      "types": [
        "混沌"
      ]
    },
    {
      "id": 223,
      "name": "神靈",
      "isDouble": false,
      "primary": "神靈",
      "secondary": null,
      "types": [
        "神靈"
      ]
    },
    {
      "id": 224,
      "name": "輪迴",
      "isDouble": false,
      "primary": "輪迴",
      "secondary": null,
      "types": [
        "輪迴"
      ]
    },
    {
      "id": 225,
      "name": "蟲",
      "isDouble": false,
      "primary": "蟲",
      "secondary": null,
      "types": [
        "蟲"
      ]
    },
    {
      "id": 226,
      "name": "虛空",
      "isDouble": false,
      "primary": "虛空",
      "secondary": null,
      "types": [
        "虛空"
      ]
    }
  ]
};
