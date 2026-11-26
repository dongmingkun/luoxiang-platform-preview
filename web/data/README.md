# web/data

- `dataset_template.csv`：队友数据模板（只有表头，直接复制填写）。
- `dataset_demo.csv`：**格式演示数据**，用于展示导入/曲线/3D；不是真实病例、不是实验结果、不是疗效证据。
- `herbs/catalog.json`：用户提供中草药资料的只读字段投影，50,854 条记录（不是五万种药材），供 `herbs.html` 检索，不是时序推演/问卷数据。
- `herbs/quality.json`：源文件/目录哈希、缺失/重复统计、JSON/CSV 逐行一致性结果。医学内容、来源与许可待核实；原件和接入说明见 [`../../datasets/herbs/README.md`](../../datasets/herbs/README.md)。

字段规范见 [`../../docs/数据接入规范.md`](../../docs/数据接入规范.md)。

**不要把真实病例/可识别数据放在这里。** 真实数据只放 `challenge_cup/data/real/`（已 gitignore），经脱敏/伦理/许可确认后，才把教学参数版本放入演示目录。
