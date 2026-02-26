function isWechat() {
  return /MicroMessenger/i.test(navigator.userAgent);
}

function isWhitelist(url) {
  const whitelist = [
    "mp.weixin.qq.com",
    "m.tb.cn",
    "jd.com",
    "taobao.com",
    "tmall.com",
    "weibo.com",
    "qq.com",
  ];
  try {
    const urlObj = new URL(url);
    return whitelist.some((domain) => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

function parseBio(text) {
  if (!text) return "";
  const escapeHtml = (str) => {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };
  let parsed = escapeHtml(text);
  parsed = parsed.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, \'$2\')">$1</a>',
  );
  const urlRegex = /(https?:\/\/[^\s<]+)(?![^<]*<\/a>)/g;
  parsed = parsed.replace(urlRegex, (url) => {
    if (parsed.indexOf(`href="${url}"`) > -1) return url;
    return `<a href="${url}" class="bio-link" target="_blank" rel="noopener noreferrer" onclick="return handleLinkClick(event, '${url}')">${url}</a>`;
  });
  parsed = parsed.replace(/\n/g, "<br>");
  return parsed;
}

window.handleLinkClick = function (event, url) {
  if (isWechat() && !isWhitelist(url)) {
    event.preventDefault();
    Alpine.store("wechatModal").open(url);
    return false;
  }
  return true;
};

document.addEventListener("alpine:init", () => {
  Alpine.store("wechatModal", {
    isOpen: false,
    url: "",
    open(url) {
      this.url = url;
      this.isOpen = true;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.isOpen = false;
      this.url = "";
      document.body.style.overflow = "";
    },
    proceed() {
      if (this.url) window.open(this.url, "_blank");
      this.close();
    },
    async copyLink() {
      if (!this.url) return;
      try {
        await navigator.clipboard.writeText(this.url);
        Alpine.store("toast").show("链接已复制到剪贴板");
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = this.url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          Alpine.store("toast").show("链接已复制到剪贴板");
        } catch {
          Alpine.store("toast").show("复制失败，请手动复制");
        }
        document.body.removeChild(textarea);
      }
    },
  });

  Alpine.store("toast", {
    isVisible: false,
    message: "",
    timeout: null,
    show(message, duration = 2000) {
      this.message = message;
      this.isVisible = true;
      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        this.isVisible = false;
        this.message = "";
      }, duration);
    },
  });

  Alpine.store("homepageModal", {
    isOpen: false,
    memberName: "",
    links: [],
    open(links, memberName) {
      if (!links || links.length === 0) {
        Alpine.store("toast").show("该成员暂无主页链接");
        return;
      }
      this.links = links;
      this.memberName = memberName;
      this.isOpen = true;
      document.body.style.overflow = "hidden";
    },
    close() {
      this.isOpen = false;
      this.links = [];
      this.memberName = "";
      document.body.style.overflow = "";
    },
    navigate(url) {
      if (isWechat() && !isWhitelist(url)) {
        Alpine.store("wechatModal").open(url);
        this.close();
      } else {
        window.open(url, "_blank");
        this.close();
      }
    }
  });
});

function studioApp() {
  return {
    roles: [],
    members: [],
    currentRole: "all",
    currentSubRole: "all",
    loading: true,
    error: null,

    get currentSubRoles() {
      const role = this.roles.find((r) => r.id === this.currentRole);
      return role && role.subRoles ? role.subRoles : [];
    },

    get filteredMembers() {
      let result = [];

      if (this.currentRole === "all") {
        result = this.members;
      } else {
        result = this.members.filter((m) => {
          if (m.roleIds && Array.isArray(m.roleIds)) {
            return m.roleIds.includes(this.currentRole);
          }
          if (m.roleId) {
            return m.roleId === this.currentRole;
          }
          return false;
        });

        if (this.currentSubRole !== "all" && this.currentSubRoles.length > 0) {
          result = result.filter((m) => {
            if (m.software === this.currentSubRole) return true;
            if (m.softwares && m.softwares.includes(this.currentSubRole))
              return true;
            return false;
          });
        }
      }

      return result.sort((a, b) => 
        (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
      );
    },

    async init() {
      this.loading = true;
      this.error = null;

      try {
        const [rolesRes, membersRes] = await Promise.all([
          fetch("data/roles.json"),
          fetch("data/members.json"),
        ]);

        if (!rolesRes.ok)
          throw new Error(`加载工种数据失败: ${rolesRes.status}`);
        if (!membersRes.ok)
          throw new Error(`加载成员数据失败: ${membersRes.status}`);

        const rolesData = await rolesRes.json();
        const membersData = await membersRes.json();

        this.roles = rolesData.sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        );
        
        this.members = membersData.sort(
          (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
        );

        console.log("✅ 数据加载成功:", {
          roles: this.roles.length,
          members: this.members.length,
        });
      } catch (err) {
        console.error("❌ 数据加载失败:", err);
        this.error = err.message;
        this.loadDefaultData();
      } finally {
        this.loading = false;
      }
    },

    loadDefaultData() {
      // 默认角色配置（含新增工种）
      this.roles = [
        { id: "arrangement", name: "编曲", color: "#BB9AF7", sortOrder: 1 },
        { id: "composition", name: "作曲", color: "#E0AF68", sortOrder: 2 },
        { id: "mixing", name: "混音", color: "#7AA2F7", sortOrder: 3 },
        {
          id: "tuning",
          name: "调校",
          color: "#F38BA8",
          sortOrder: 4,
          subRoles: [
            { id: "ace", name: "ACE Studio", color: "#FF6B6B" },
            { id: "cevio", name: "CeVIO", color: "#4ECDC4" },
            { id: "sv", name: "Synthesizer V", color: "#96CEB4" },
            { id: "vocaloid", name: "Vocaloid", color: "#DDA0DD" },
          ],
        },
        { id: "lyrics", name: "作词", color: "#9ECE6A", sortOrder: 5 },
        { id: "harmony", name: "和声编写", color: "#73DACA", sortOrder: 6 },
        { id: "video-editing", name: "混剪", color: "#FF9E64", sortOrder: 7 },
        { id: "pv", name: "PV制作", color: "#F7768E", sortOrder: 8 },
        { id: "subtitle", name: "特效字幕", color: "#B4F9F8", sortOrder: 9 },
        { id: "illustration", name: "立绘/插画", color: "#C0CAF5", sortOrder: 10 },
        { id: "singer", name: "唱见", color: "#F43F5E", sortOrder: 11 },
        { id: "cv", name: "CV", color: "#A78BFA", sortOrder: 12 },
      ];

      // 默认成员数据（按拼音首字母排序，Neruno作为Boss排最前）
      this.members = [
        {
          id: "Mian Ling",
          name: "眠铃Neruno",
          roleIds: ["lyrics", "tuning", "harmony"],
          software: "sv",
          avatar: "images/members/mian-ling.jpg",
          bio: "作词/调校/和声编写，工作室负责人兼对接，中/日/英/韩多语种作词。商务合作请联系微信 NeurnOfficial",
          sortOrder: 0,
          isBoss: true,
          homepages: [
            {"name": "哔哩哔哩", "url": "https://space.bilibili.com/3493271848356790"},
            {"name": "网易云音乐", "url": "https://music.163.com/#/user/home?id=3493271848356790"}
          ]
        },
        {
          id: "Bei Yuan",
          name: "琲鸢Sayaka",
          roleIds: ["tuning"],
          softwares: ["ace", "sv"],
          avatar: "images/members/bei-yuan.jpg",
          bio: "调校，擅长ACE Studio/Synthesizer V等多引擎调校",
          sortOrder: 1
        },
        {
          id: "Cubic J",
          name: "Cubic_J杰",
          roleIds: ["illustration"],
          avatar: "images/members/cubic-j.jpg",
          bio: "立绘/插画，原画师，多次参与游戏项目制作，擅长高精度插画及立绘",
          sortOrder: 2
        },
        {
          id: "Fan Fan Fan Qie Yu",
          name: "番番番番番茄鱼",
          roleIds: ["composition", "arrangement", "tuning", "mixing"],
          software: "ace",
          avatar: "images/members/fan-fan-fan-qie-yu.jpg",
          bio: "作曲/编曲/调校/混音，擅长多种风格音乐制作、ACE Studio调校与后期处理",
          sortOrder: 3
        },
        {
          id: "Ha Nuo",
          name: "哈娜诺诺",
          roleIds: ["video-editing", "pv"],
          avatar: "images/members/ha-nuo-nuo.jpg",
          bio: "混剪/PV制作/AE特效，擅长PV制作及动态制作",
          sortOrder: 4
        },
        {
          id: "Hui",
          name: "绘",
          roleIds: ["composition", "lyrics"],
          avatar: "images/members/hui.jpg",
          bio: "作曲/作词，真实文化负责人，擅长日语作词及作曲",
          sortOrder: 5,
          homepages: [
            {"name": "哔哩哔哩", "url": "https://space.bilibili.com/"}
          ]
        },
        {
          id: "Hun Yu Luo",
          name: "魂与洛",
          roleIds: ["video-editing"],
          avatar: "images/members/hun-yu-luo.jpg",
          bio: "混剪，擅长MAD混剪",
          sortOrder: 6
        },
        {
          id: "Jiang You Cu",
          name: "酱油醋l",
          roleIds: ["composition", "arrangement"],
          avatar: "images/members/jiang-you-cu.jpg",
          bio: "作曲/编曲，擅长流行风格音乐创作与编曲制作",
          sortOrder: 7
        },
        {
          id: "Mu Yun",
          name: "沐芸MoRocy",
          roleIds: ["video-editing", "subtitle"],
          avatar: "images/members/mu-yun.jpg",
          bio: "混剪/特效字幕，擅长MAD混剪及字幕制作",
          sortOrder: 8
        },
        {
          id: "Neku",
          name: "Neku",
          roleIds: ["composition", "arrangement", "lyrics"],
          avatar: "images/members/neku.jpg",
          bio: "作曲/编曲/日语作词，擅长高精编曲及日语作词",
          sortOrder: 9
        },
        {
          id: "Shang Tian",
          name: "上天给你摘星星呀",
          roleIds: ["lyrics", "cv", "singer", "mixing"],
          avatar: "images/members/shang-tian.jpg",
          bio: "地偶作词/CV/唱见/混音，擅长地偶中日英文作词及地偶混音制作",
          sortOrder: 10
        },
        {
          id: "Tian Chen",
          name: "天宸Official",
          roleIds: ["composition", "arrangement", "tuning"],
          softwares: ["vocaloid", "ace", "sv"],
          avatar: "images/members/tian-chen.jpg",
          bio: "作曲/编曲/调校，擅长VOCALOID/ACE Studio/Synthesizer V等多引擎调校及多种风格编曲",
          sortOrder: 11
        },
        {
          id: "Xing Chen",
          name: "星沉云落",
          roleIds: ["tuning", "mixing"],
          software: "sv",
          avatar: "images/members/xing-chen.jpg",
          bio: "调校/混音，擅长Synthesizer V人声调校与贴唱后期",
          sortOrder: 12,
          homepages: [
            {"name": "哔哩哔哩", "url": "https://space.bilibili.com/173447787"}
          ]
        },
        {
          id: "Yu Heng",
          name: "宇衡Yu_H",
          roleIds: ["tuning"],
          softwares: ["vocaloid", "ace"],
          avatar: "images/members/yu-heng.jpg",
          bio: "调校，擅长VOCALOID/ACE Studio调校",
          sortOrder: 13
        },
        {
          id: "Yun Hui",
          name: "云晦",
          roleIds: ["lyrics", "tuning"],
          software: "sv",
          avatar: "images/members/yun-hui.jpg",
          bio: "作词/调校，擅长Synthesizer V人声调校",
          sortOrder: 14
        }
      ];
    },

    async copyToClipboard(text, successMessage) {
      try {
        await navigator.clipboard.writeText(text);
        Alpine.store("toast").show(successMessage);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          Alpine.store("toast").show(successMessage);
        } catch {
          Alpine.store("toast").show("复制失败，请手动复制");
        }
        document.body.removeChild(textarea);
      }
    },

    handleAvatarClick(member) {
      if (!member.homepages || member.homepages.length === 0) {
        Alpine.store("toast").show("该成员暂无主页链接");
        return;
      }
      
      if (member.homepages.length === 1) {
        const url = member.homepages[0].url;
        if (isWechat() && !isWhitelist(url)) {
          Alpine.store("wechatModal").open(url);
        } else {
          window.open(url, "_blank");
        }
      } else {
        Alpine.store("homepageModal").open(member.homepages, member.name);
      }
    },

    selectRole(roleId) {
      this.currentRole = roleId;
      this.currentSubRole = "all";
    },

    selectSubRole(subRoleId) {
      this.currentSubRole = subRoleId;
    },

    getCurrentRoleColor() {
      const role = this.roles.find((r) => r.id === this.currentRole);
      return role ? role.color : "#7AA2F7";
    },

    getRoleColor(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      return role ? role.color : "#7AA2F7";
    },

    getRoleName(roleId) {
      const role = this.roles.find((r) => r.id === roleId);
      return role ? role.name : "未知";
    },

    getSoftwareName(softwareId) {
      const allSubRoles = this.roles.flatMap((r) => r.subRoles || []);
      const subRole = allSubRoles.find((sr) => sr.id === softwareId);
      return subRole ? subRole.name : softwareId.toUpperCase();
    },

    parseBio,
  };
}

if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute("data-src");
          }
          imageObserver.unobserve(img);
        }
      });
    },
    { rootMargin: "50px 0px" },
  );

  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    imageObserver.observe(img);
  });
}

if (isWechat()) {
  document.documentElement.classList.add("wechat-ua");
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}