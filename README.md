## 安装方式
```
git clone https://github.com/3253473591/nerun-studio.git
```

## 主要功能

- 展示所有成员的头像、名字、擅长领域
- 按部门筛选
- 点击头像跳转到成员的 B站/网易云主页

---

## 文件说明

### members.json
**作用**：存放所有成员的个人资料。

**示例条目**：
```json
{
  "id": "Mian Ling",
  "name": "眠铃Neruno",
  "roleIds": ["lyrics", "tuning", "harmony"],  // 作词、调校、和声编写
  "software": "sv",  // 主要用 Synthesizer V
  "avatar": "images/members/眠铃.jpg",  // 头像照片位置
  "bio": "作词/调校/和声编写，工作室负责人...",
  "sortOrder": 0,  // 排序号，0 表示排在最前面
  "isBoss": true,  // 标记为负责人，会显示特殊边框
  "homepages": [   // 点击头像会跳转到这些链接
    {"name": "哔哩哔哩", "url": "https://space.bilibili.com/..."},
    {"name": "网易云音乐", "url": "https://music.163.com/..."}
  ]
}
```

### roles.json
**作用**：定义部门、职位、软件分类。

**结构**：
- **音乐部**：编曲、作曲、混音、调校、作词、和声编写
  - 调校角色下还细分软件引擎：ACE Studio、Synthesizer V、Vocaloid 等
- **视频部**：混剪、PV制作、AE特效、字幕特效
- **美术部**：立绘/插画

### site-config.json
**作用**：网站顶部的标题、联系方式等公共信息。

**可修改内容**：
- 工作室名称
- 标语
- 微信号、邮箱（点击页面顶部按钮可直接复制）
- 负责人特殊标记的颜色

### 4. ui-text.json
**作用**：页面上的各种提示文字，像展厅里的指示牌。

**包含**：
- "加载失败"时的提示
- "微信号已复制"的提示

---

## 常用操作指南

### 新增一名成员

**步骤**：
1. 准备一张正方形头像照片，放入 `images/members/` 文件夹
2. 打开 `members.json`，在列表最后添加新条目（注意在前后加上英文逗号 `,`）
3. 填写信息：
   - `id`：英文代号（如 `"Zhang San"`），不能重复
   - `name`：显示的中文名（如 `"张三"`)
   - `roleIds`：从 `roles.json` 里找对应的职位代号填入
   - `avatar`：图片路径，如 `"images/members/zhang-san.jpg"`
   - `sortOrder`：数字越小排越前，建议新成员往后排（给大数字）

**格式示例**：
```json
{
  "id": "Zhang San",
  "name": "张三",
  "roleIds": ["composition", "arrangement"],  // 会作曲和编曲
  "avatar": "images/members/zhang-san.jpg",
  "bio": "擅长流行风格作曲",
  "sortOrder": 15,  // 排在第15位
  "homepages": [
    {"name": "哔哩哔哩", "url": "https://space.bilibili.com/123456"}
  ]
}
```

### 修改成员信息

直接在 `members.json` 中找到对应名字，修改相应文字即可。

**特别提示 - 个人简介加链接**：
如果想在简介里插入代表作，可以用这种格式：
```
代表作：[视频标题](https://www.bilibili.com/video/BVxxxxx)
```
显示效果会是一个可点击的蓝色链接。

### 调整排序

修改sortOrder的数字：
- **负责人**：设为0（最前面，且有特殊金色边框）
- **其他成员**：按加入时间或重要性，数字越小越靠前

### 更换联系方式

修改site-config.json：
- `contact.wechat.id`：微信号
- `contact.email.address`：邮箱地址

修改后，页面顶部的"微信""邮箱"按钮点击后会自动复制新号码。

### 增减部门或职位

修改 `roles.json`：
- **新增部门**：复制一个现有部门块，修改 id、name和roles列表
- **新增职位**：在对应部门的 `roles` 数组中添加新条目，选择一个颜色代码

### 图片存放位置

- 成员头像：images/members/
