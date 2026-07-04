import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  Plus, TrendingUp, TrendingDown, Wallet, Calendar,
  Download, Trash2, PenLine, X, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, Settings2, PiggyBank, Repeat, Power,
  Utensils, Car, Fuel, Home, Film, Gamepad2, Gift, HeartPulse,
  GraduationCap, ShoppingBag, Receipt, Plane, Shirt, Sparkles,
  PawPrint, Wrench, Banknote, TrendingUp as TrendingUpIcon,
  HandCoins, Baby, Coffee, Smartphone, Tag, MoreHorizontal,
} from "lucide-react";

// ---------- Helpers ----------
const fmt = (n) => {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("vi-VN");
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const monthKey = (iso) => iso.slice(0, 7); // YYYY-MM
const yearKey = (iso) => iso.slice(0, 4); // YYYY

// Cộng thêm n tháng vào 1 ngày, tự động chỉnh nếu tháng đích không đủ ngày (VD: 31/1 + 1 tháng -> 28 hoặc 29/2)
const addMonths = (date, n) => {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const lastDayOfTarget = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDayOfTarget));
  return d;
};
const addPeriod = (date, freq) => {
  if (freq === "ngay") {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (freq === "thang") return addMonths(date, 1);
  if (freq === "nam") return addMonths(date, 12);
  return new Date(date);
};
const toISO = (d) => d.toISOString().slice(0, 10);
const FREQ_LABEL = { ngay: "Hàng ngày", thang: "Hàng tháng", nam: "Hàng năm" };

// Tính các ngày đến hạn của 1 khoản định kỳ, từ lần tạo gần nhất tới hôm nay (bắt kịp nếu bỏ lỡ)
const getDueDates = (rule, todayIso) => {
  const start = new Date(rule.startDate + "T00:00:00");
  const today = new Date(todayIso + "T00:00:00");
  if (start > today) return [];
  let cursor = rule.lastGenerated
    ? addPeriod(new Date(rule.lastGenerated + "T00:00:00"), rule.frequency)
    : start;
  const dates = [];
  let guard = 0;
  while (cursor <= today && guard < 2000) {
    dates.push(toISO(cursor));
    cursor = addPeriod(cursor, rule.frequency);
    guard++;
  }
  return dates;
};

const PALETTE = [
  "#16233F", "#3FAE8A", "#C9963B", "#5C7A9E", "#7D5A8C",
  "#C1443D", "#2E8C93", "#B98A4E", "#3E4C8A", "#7A9A7E",
];
const colorFor = (name, list) => {
  const idx = list.indexOf(name);
  return PALETTE[idx % PALETTE.length];
};

// Đoán icon + màu phù hợp theo tên danh mục (kể cả danh mục người dùng tự đặt), có phương án dự phòng
const CAT_ICON_RULES = [
  [["ăn", "uống", "cà phê", "cafe", "trà"], Utensils, "#E0654B"],
  [["di chuyển", "xăng", "xe", "grab", "taxi", "gửi xe", "vé xe"], Car, "#3E6FB0"],
  [["nhà", "thuê", "điện", "nước", "internet", "hóa đơn"], Home, "#B98A4E"],
  [["giải trí", "phim", "game", "xem"], Film, "#7D5A8C"],
  [["lương"], Banknote, "#1F7A5C"],
  [["thưởng"], Banknote, "#C9963B"],
  [["quà", "tặng"], Gift, "#C1447D"],
  [["y tế", "sức khỏe", "khám", "thuốc", "bệnh viện"], HeartPulse, "#3F9E6D"],
  [["học", "giáo dục", "sách", "khóa học"], GraduationCap, "#3E4C8A"],
  [["mua sắm", "shopping", "đồ dùng"], ShoppingBag, "#9A5CB4"],
  [["du lịch", "vé máy bay", "khách sạn"], Plane, "#2E8C93"],
  [["quần áo", "thời trang"], Shirt, "#A85C3A"],
  [["làm đẹp", "spa", "mỹ phẩm", "tóc"], Sparkles, "#D98BB0"],
  [["thú cưng", "pet"], PawPrint, "#6B8F71"],
  [["sửa chữa", "sửa", "bảo trì"], Wrench, "#6B7280"],
  [["đầu tư", "cổ phiếu", "chứng khoán"], TrendingUpIcon, "#1B5E6B"],
  [["vay", "nợ", "trả góp", "cho mượn", "mượn"], HandCoins, "#8C5E3C"],
  [["con", "em bé", "bỉm", "sữa"], Baby, "#4FA3C7"],
  [["điện thoại", "cước", "sim"], Smartphone, "#5C7A9E"],
];
const CAT_FALLBACK_COLORS = [
  "#16233F", "#3FAE8A", "#C9963B", "#5C7A9E", "#7D5A8C",
  "#C1443D", "#2E8C93", "#B98A4E", "#3E4C8A", "#7A9A7E",
];
const hashColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return CAT_FALLBACK_COLORS[Math.abs(hash) % CAT_FALLBACK_COLORS.length];
};
const getCatIcon = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("khác")) return MoreHorizontal;
  for (const [keywords, Icon] of CAT_ICON_RULES) {
    if (keywords.some((k) => n.includes(k))) return Icon;
  }
  return Tag;
};
const getCatColor = (name) => {
  const n = (name || "").toLowerCase();
  if (n.includes("khác")) return "#7C8798";
  for (const [keywords, , color] of CAT_ICON_RULES) {
    if (keywords.some((k) => n.includes(k))) return color;
  }
  return hashColor(name || "");
};

const STORAGE_KEY_TX = "soquy:transactions";
const STORAGE_KEY_CATS = "soquy:categories";
const STORAGE_KEY_BUDGETS = "soquy:budgets";
const STORAGE_KEY_RECURRING = "soquy:recurring";

const DEFAULT_CATS = {
  thu: ["Lương", "Thưởng", "Khác"],
  chi: ["Ăn uống", "Di chuyển", "Nhà cửa", "Giải trí", "Khác"],
};

export default function SoQuy() {
  const [ready, setReady] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [budgets, setBudgets] = useState({}); // { "YYYY-MM:catName": amount }
  const [recurringRules, setRecurringRules] = useState([]);

  const [view, setView] = useState("nhap"); // nhap | so-cai | bao-cao | ngan-sach | dinh-ky
  const [toast, setToast] = useState(null);

  // Form state
  const [type, setType] = useState("chi");
  const [amount, setAmount] = useState("");
  const [cat, setCat] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Recurring form state
  const [rType, setRType] = useState("chi");
  const [rAmount, setRAmount] = useState("");
  const [rCat, setRCat] = useState("");
  const [rFreq, setRFreq] = useState("thang");
  const [rStartDate, setRStartDate] = useState(todayISO());
  const [rNote, setRNote] = useState("");
  const [editingRecurringId, setEditingRecurringId] = useState(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);

  // Report period
  const [reportMode, setReportMode] = useState("thang"); // ngay | thang | nam
  const [anchorDate, setAnchorDate] = useState(todayISO());

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // ---------- Load from storage ----------
  useEffect(() => {
    (async () => {
      try {
        const [txRes, catRes, budRes, recRes] = await Promise.allSettled([
          window.storage.get(STORAGE_KEY_TX),
          window.storage.get(STORAGE_KEY_CATS),
          window.storage.get(STORAGE_KEY_BUDGETS),
          window.storage.get(STORAGE_KEY_RECURRING),
        ]);
        let txList = txRes.status === "fulfilled" && txRes.value ? JSON.parse(txRes.value.value) : [];
        let catsObj = catRes.status === "fulfilled" && catRes.value ? JSON.parse(catRes.value.value) : DEFAULT_CATS;
        let budObj = budRes.status === "fulfilled" && budRes.value ? JSON.parse(budRes.value.value) : {};
        let recList = recRes.status === "fulfilled" && recRes.value ? JSON.parse(recRes.value.value) : [];

        // Tự động sinh các giao dịch định kỳ còn thiếu, tính đến hôm nay
        const today = todayISO();
        let generatedCount = 0;
        const newTxs = [];
        recList = recList.map((rule) => {
          if (!rule.active) return rule;
          const dueDates = getDueDates(rule, today);
          if (dueDates.length === 0) return rule;
          dueDates.forEach((d) => {
            newTxs.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: rule.type,
              amount: rule.amount,
              category: rule.category,
              date: d,
              note: rule.note ? `Định kỳ · ${rule.note}` : "Định kỳ",
              time: nowHM(),
              isRecurring: true,
              recurringId: rule.id,
            });
          });
          generatedCount += dueDates.length;
          return { ...rule, lastGenerated: dueDates[dueDates.length - 1] };
        });

        if (newTxs.length > 0) {
          txList = [...newTxs, ...txList];
          await window.storage.set(STORAGE_KEY_TX, JSON.stringify(txList));
          await window.storage.set(STORAGE_KEY_RECURRING, JSON.stringify(recList));
        }

        setTransactions(txList);
        setCategories(catsObj);
        setBudgets(budObj);
        setRecurringRules(recList);

        if (generatedCount > 0) {
          setTimeout(() => showToast(`Đã tự động ghi ${generatedCount} khoản định kỳ`), 400);
        }
      } catch (e) {
        console.error("Lỗi tải dữ liệu:", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // ---------- Persist helpers ----------
  const saveTx = useCallback(async (next) => {
    setTransactions(next);
    try {
      await window.storage.set(STORAGE_KEY_TX, JSON.stringify(next));
    } catch (e) {
      console.error("Lỗi lưu giao dịch:", e);
    }
  }, []);

  const saveCats = useCallback(async (next) => {
    setCategories(next);
    try {
      await window.storage.set(STORAGE_KEY_CATS, JSON.stringify(next));
    } catch (e) {
      console.error("Lỗi lưu danh mục:", e);
    }
  }, []);

  const saveBudgets = useCallback(async (next) => {
    setBudgets(next);
    try {
      await window.storage.set(STORAGE_KEY_BUDGETS, JSON.stringify(next));
    } catch (e) {
      console.error("Lỗi lưu ngân sách:", e);
    }
  }, []);

  const saveRecurring = useCallback(async (next) => {
    setRecurringRules(next);
    try {
      await window.storage.set(STORAGE_KEY_RECURRING, JSON.stringify(next));
    } catch (e) {
      console.error("Lỗi lưu khoản định kỳ:", e);
    }
  }, []);

  useEffect(() => {
    if (ready && !cat) {
      const list = categories[type];
      if (list && list.length) setCat(list[0]);
    }
  }, [ready, type, categories]); // eslint-disable-line

  useEffect(() => {
    if (ready && !rCat) {
      const list = categories[rType];
      if (list && list.length) setRCat(list[0]);
    }
  }, [ready, rType, categories]); // eslint-disable-line

  // ---------- Derived: running balance ----------
  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        (a.date + (a.time || "") + a.id).localeCompare(b.date + (b.time || "") + b.id)
      ),
    [transactions]
  );
  const totalBalance = useMemo(
    () =>
      transactions.reduce(
        (s, t) => s + (t.type === "thu" ? Number(t.amount) : -Number(t.amount)),
        0
      ),
    [transactions]
  );

  // ---------- Form submit ----------
  const resetForm = () => {
    setAmount("");
    setNote("");
    setEditingId(null);
    setDate(todayISO());
    setCat(categories[type][0] || "");
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      showToast("Nhập số tiền hợp lệ");
      return;
    }
    if (!cat) {
      showToast("Chọn danh mục");
      return;
    }
    if (editingId) {
      // Sửa nội dung nhưng giữ nguyên giờ ghi nhận gốc
      const next = transactions.map((t) =>
        t.id === editingId ? { ...t, type, amount: amt, category: cat, date, note } : t
      );
      await saveTx(next);
      showToast("Đã cập nhật giao dịch");
    } else {
      const rec = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        amount: amt,
        category: cat,
        date,
        note,
        time: nowHM(), // giờ:phút lúc nhập, tự động, không thể chỉnh tay
      };
      await saveTx([rec, ...transactions]);
      showToast(type === "thu" ? "Đã thêm khoản thu" : "Đã thêm khoản chi");
    }
    resetForm();
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setType(t.type);
    setAmount(String(t.amount));
    setCat(t.category);
    setDate(t.date);
    setNote(t.note || "");
    setView("nhap");
  };

  const deleteTx = async (id) => {
    await saveTx(transactions.filter((t) => t.id !== id));
    showToast("Đã xoá giao dịch");
  };

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories[type].includes(name)) {
      showToast("Danh mục đã tồn tại");
      return;
    }
    const next = { ...categories, [type]: [...categories[type], name] };
    await saveCats(next);
    setCat(name);
    setNewCatName("");
    setShowNewCat(false);
  };

  // ---------- Recurring rules ----------
  const resetRecurringForm = () => {
    setRAmount("");
    setRNote("");
    setEditingRecurringId(null);
    setRStartDate(todayISO());
    setRCat(categories[rType][0] || "");
    setShowRecurringForm(false);
  };

  const handleRecurringSubmit = async () => {
    const amt = parseFloat(rAmount);
    if (!amt || amt <= 0) {
      showToast("Nhập số tiền hợp lệ");
      return;
    }
    if (!rCat) {
      showToast("Chọn danh mục");
      return;
    }
    if (editingRecurringId) {
      const next = recurringRules.map((r) =>
        r.id === editingRecurringId
          ? { ...r, type: rType, amount: amt, category: rCat, frequency: rFreq, startDate: rStartDate, note: rNote }
          : r
      );
      await saveRecurring(next);
      showToast("Đã cập nhật khoản định kỳ");
    } else {
      const rule = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: rType,
        amount: amt,
        category: rCat,
        frequency: rFreq,
        startDate: rStartDate,
        note: rNote,
        active: true,
        lastGenerated: null,
      };
      // Sinh ngay các giao dịch đến hạn tính từ ngày bắt đầu tới hôm nay
      const dueDates = getDueDates(rule, todayISO());
      let finalRule = rule;
      if (dueDates.length > 0) {
        const newTxs = dueDates.map((d) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          date: d,
          note: rule.note ? `Định kỳ · ${rule.note}` : "Định kỳ",
          time: nowHM(),
          isRecurring: true,
          recurringId: rule.id,
        }));
        await saveTx([...newTxs, ...transactions]);
        finalRule = { ...rule, lastGenerated: dueDates[dueDates.length - 1] };
      }
      await saveRecurring([finalRule, ...recurringRules]);
      showToast(dueDates.length > 0 ? `Đã tạo và ghi ${dueDates.length} giao dịch` : "Đã tạo khoản định kỳ");
    }
    resetRecurringForm();
  };

  const startEditRecurring = (r) => {
    setEditingRecurringId(r.id);
    setRType(r.type);
    setRAmount(String(r.amount));
    setRCat(r.category);
    setRFreq(r.frequency);
    setRStartDate(r.startDate);
    setRNote(r.note || "");
    setShowRecurringForm(true);
  };

  const deleteRecurring = async (id) => {
    await saveRecurring(recurringRules.filter((r) => r.id !== id));
    showToast("Đã xoá khoản định kỳ");
  };

  const toggleRecurringActive = async (id) => {
    const next = recurringRules.map((r) => {
      if (r.id !== id) return r;
      if (!r.active) {
        // Khi bật lại, bỏ qua khoảng thời gian đã tắt để tránh dồn quá nhiều giao dịch cũ
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return { ...r, active: true, lastGenerated: toISO(y) };
      }
      return { ...r, active: false };
    });
    await saveRecurring(next);
  };

  // ---------- Report data ----------
  const periodLabel = useMemo(() => {
    const d = new Date(anchorDate + "T00:00:00");
    if (reportMode === "ngay") return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    if (reportMode === "thang") return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    return `Năm ${d.getFullYear()}`;
  }, [anchorDate, reportMode]);

  const filteredForPeriod = useMemo(() => {
    if (reportMode === "ngay") return transactions.filter((t) => t.date === anchorDate);
    if (reportMode === "thang") return transactions.filter((t) => monthKey(t.date) === monthKey(anchorDate));
    return transactions.filter((t) => yearKey(t.date) === yearKey(anchorDate));
  }, [transactions, reportMode, anchorDate]);

  const periodThu = filteredForPeriod.filter((t) => t.type === "thu").reduce((s, t) => s + Number(t.amount), 0);
  const periodChi = filteredForPeriod.filter((t) => t.type === "chi").reduce((s, t) => s + Number(t.amount), 0);

  const pieData = useMemo(() => {
    const map = {};
    filteredForPeriod
      .filter((t) => t.type === "chi")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredForPeriod]);

  const barData = useMemo(() => {
    // last 6 buckets depending on mode
    const buckets = [];
    const d = new Date(anchorDate + "T00:00:00");
    if (reportMode === "ngay") {
      for (let i = 6; i >= 0; i--) {
        const dd = new Date(d);
        dd.setDate(dd.getDate() - i);
        const iso = dd.toISOString().slice(0, 10);
        const thu = transactions.filter((t) => t.date === iso && t.type === "thu").reduce((s, t) => s + Number(t.amount), 0);
        const chi = transactions.filter((t) => t.date === iso && t.type === "chi").reduce((s, t) => s + Number(t.amount), 0);
        buckets.push({ label: `${dd.getDate()}/${dd.getMonth() + 1}`, Thu: thu, Chi: chi });
      }
    } else if (reportMode === "thang") {
      for (let i = 5; i >= 0; i--) {
        const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const mk = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
        const thu = transactions.filter((t) => monthKey(t.date) === mk && t.type === "thu").reduce((s, t) => s + Number(t.amount), 0);
        const chi = transactions.filter((t) => monthKey(t.date) === mk && t.type === "chi").reduce((s, t) => s + Number(t.amount), 0);
        buckets.push({ label: `T${dd.getMonth() + 1}`, Thu: thu, Chi: chi });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const yr = d.getFullYear() - i;
        const thu = transactions.filter((t) => yearKey(t.date) === String(yr) && t.type === "thu").reduce((s, t) => s + Number(t.amount), 0);
        const chi = transactions.filter((t) => yearKey(t.date) === String(yr) && t.type === "chi").reduce((s, t) => s + Number(t.amount), 0);
        buckets.push({ label: String(yr), Thu: thu, Chi: chi });
      }
    }
    return buckets;
  }, [transactions, reportMode, anchorDate]);

  const shiftPeriod = (dir) => {
    const d = new Date(anchorDate + "T00:00:00");
    if (reportMode === "ngay") d.setDate(d.getDate() + dir);
    else if (reportMode === "thang") d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setAnchorDate(d.toISOString().slice(0, 10));
  };

  // ---------- Budgets ----------
  const currentMonthKey = monthKey(todayISO());
  const allCats = [...new Set([...categories.chi])];
  const monthChiByCat = useMemo(() => {
    const map = {};
    transactions
      .filter((t) => t.type === "chi" && monthKey(t.date) === currentMonthKey)
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [transactions, currentMonthKey]);

  const setBudgetFor = async (catName, val) => {
    const key = `${currentMonthKey}:${catName}`;
    const next = { ...budgets };
    if (!val || Number(val) <= 0) delete next[key];
    else next[key] = Number(val);
    await saveBudgets(next);
  };

  // ---------- Export Excel ----------
  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = sorted.map((t) => ({
        "Ngày": t.date,
        "Giờ": t.time || "",
        "Loại": t.type === "thu" ? "Thu" : "Chi",
        "Danh mục": t.category,
        "Số tiền": Number(t.amount),
        "Ghi chú": t.note || "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Giao dịch");

      // summary sheet
      const summaryMap = {};
      transactions.forEach((t) => {
        const mk = monthKey(t.date);
        summaryMap[mk] = summaryMap[mk] || { thu: 0, chi: 0 };
        summaryMap[mk][t.type] += Number(t.amount);
      });
      const summaryRows = Object.entries(summaryMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([mk, v]) => ({
          "Tháng": mk,
          "Tổng thu": v.thu || 0,
          "Tổng chi": v.chi || 0,
          "Số dư": (v.thu || 0) - (v.chi || 0),
        }));
      const ws2 = XLSX.utils.json_to_sheet(summaryRows);
      ws2["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Tổng hợp theo tháng");

      XLSX.writeFile(wb, `so-quy-ca-nhan-${todayISO()}.xlsx`);
      showToast("Đã xuất file Excel");
    } catch (e) {
      console.error(e);
      showToast("Không thể xuất file, thử lại sau");
    }
  };

  if (!ready) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: INK_SOFT, fontFamily: SERIF, fontSize: 18 }}>Đang mở sổ quỹ…</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <style>{fontImport}</style>

      {/* Header */}
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>SỔ QUỸ CÁ NHÂN</div>
          <div style={styles.balanceLabel}>Số dư hiện tại</div>
          <div style={{ ...styles.balanceValue, color: totalBalance >= 0 ? MINT : DANGER_ON_DARK }}>
            {totalBalance < 0 ? "-" : ""}{fmt(Math.abs(totalBalance))} <span style={styles.dong}>đ</span>
          </div>
        </div>
        <button style={styles.exportBtn} onClick={exportExcel} aria-label="Xuất Excel">
          <Download size={16} strokeWidth={2.2} />
          <span>Xuất Excel</span>
        </button>
      </header>

      {/* Content */}
      <main style={styles.main}>
        {view === "nhap" && (
          <EntryView
            type={type} setType={setType}
            amount={amount} setAmount={setAmount}
            cat={cat} setCat={setCat}
            date={date} setDate={setDate}
            note={note} setNote={setNote}
            categories={categories}
            showNewCat={showNewCat} setShowNewCat={setShowNewCat}
            newCatName={newCatName} setNewCatName={setNewCatName}
            addCategory={addCategory}
            handleSubmit={handleSubmit}
            editingId={editingId}
            resetForm={resetForm}
            recent={sorted.slice(0, 5).reverse()}
            onEdit={startEdit}
            onDelete={deleteTx}
          />
        )}

        {view === "so-cai" && (
          <LedgerView transactions={sorted} onEdit={startEdit} onDelete={deleteTx} />
        )}

        {view === "bao-cao" && (
          <ReportView
            reportMode={reportMode} setReportMode={setReportMode}
            periodLabel={periodLabel} shiftPeriod={shiftPeriod}
            periodThu={periodThu} periodChi={periodChi}
            pieData={pieData} barData={barData}
            categories={categories}
          />
        )}

        {view === "ngan-sach" && (
          <BudgetView
            allCats={allCats}
            budgets={budgets}
            currentMonthKey={currentMonthKey}
            monthChiByCat={monthChiByCat}
            setBudgetFor={setBudgetFor}
          />
        )}

        {view === "dinh-ky" && (
          <RecurringView
            rules={recurringRules}
            categories={categories}
            rType={rType} setRType={setRType}
            rAmount={rAmount} setRAmount={setRAmount}
            rCat={rCat} setRCat={setRCat}
            rFreq={rFreq} setRFreq={setRFreq}
            rStartDate={rStartDate} setRStartDate={setRStartDate}
            rNote={rNote} setRNote={setRNote}
            showRecurringForm={showRecurringForm} setShowRecurringForm={setShowRecurringForm}
            editingRecurringId={editingRecurringId}
            handleRecurringSubmit={handleRecurringSubmit}
            resetRecurringForm={resetRecurringForm}
            startEditRecurring={startEditRecurring}
            deleteRecurring={deleteRecurring}
            toggleRecurringActive={toggleRecurringActive}
          />
        )}
      </main>

      {/* Bottom nav */}
      <nav style={styles.nav}>
        <NavBtn icon={<Plus size={20} />} label="Nhập" active={view === "nhap"} onClick={() => setView("nhap")} />
        <NavBtn icon={<Wallet size={20} />} label="Sổ cái" active={view === "so-cai"} onClick={() => setView("so-cai")} />
        <NavBtn icon={<TrendingUp size={20} />} label="Báo cáo" active={view === "bao-cao"} onClick={() => setView("bao-cao")} />
        <NavBtn icon={<PiggyBank size={20} />} label="Ngân sách" active={view === "ngan-sach"} onClick={() => setView("ngan-sach")} />
        <NavBtn icon={<Repeat size={20} />} label="Định kỳ" active={view === "dinh-ky"} onClick={() => setView("dinh-ky")} />
      </nav>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ================= Sub-views =================

function EntryView({
  type, setType, amount, setAmount, cat, setCat, date, setDate, note, setNote,
  categories, showNewCat, setShowNewCat, newCatName, setNewCatName, addCategory,
  handleSubmit, editingId, resetForm, recent, onEdit, onDelete,
}) {
  const list = categories[type] || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={styles.card}>
        {editingId && (
          <div style={styles.editingBanner}>
            <PenLine size={14} />
            <span>Đang sửa giao dịch</span>
            <button style={styles.cancelEditBtn} onClick={resetForm}><X size={14} /></button>
          </div>
        )}

        {/* Type toggle */}
        <div style={styles.typeToggle}>
          <button
            style={{ ...styles.typeBtn, ...(type === "chi" ? styles.typeBtnActiveChi : {}) }}
            onClick={() => { setType("chi"); setCat(""); }}
          >
            <TrendingDown size={16} /> Chi
          </button>
          <button
            style={{ ...styles.typeBtn, ...(type === "thu" ? styles.typeBtnActiveThu : {}) }}
            onClick={() => { setType("thu"); setCat(""); }}
          >
            <TrendingUp size={16} /> Thu
          </button>
        </div>

        {/* Amount */}
        <label style={styles.fieldLabel}>Số tiền</label>
        <div style={styles.amountRow}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={styles.amountInput}
          />
          <span style={styles.dongSuffix}>đ</span>
        </div>

        {/* Category */}
        <label style={styles.fieldLabel}>Danh mục</label>
        <div style={styles.catGrid}>
          {list.map((c) => {
            const Icon = getCatIcon(c);
            const iconColor = getCatColor(c);
            const active = cat === c;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  ...styles.catChip,
                  ...(active ? { background: INK, color: PAPER, borderColor: INK } : {}),
                }}
              >
                <Icon size={14} strokeWidth={2} color={active ? PAPER : iconColor} />
                {c}
              </button>
            );
          })}
          <button style={styles.catChipAdd} onClick={() => setShowNewCat((s) => !s)}>
            <Plus size={13} /> Danh mục mới
          </button>
        </div>

        {showNewCat && (
          <div style={styles.newCatRow}>
            <input
              style={styles.newCatInput}
              placeholder="Tên danh mục..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <button style={styles.newCatSave} onClick={addCategory}>Thêm</button>
          </div>
        )}

        {/* Date */}
        <label style={styles.fieldLabel}>Ngày</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={styles.dateInput}
        />

        {/* Note */}
        <label style={styles.fieldLabel}>Ghi chú (tuỳ chọn)</label>
        <input
          type="text"
          placeholder="VD: Ăn trưa với đồng nghiệp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={styles.noteInput}
        />

        <button
          style={{ ...styles.submitBtn, background: type === "chi" ? DANGER : SUCCESS }}
          onClick={handleSubmit}
        >
          {editingId ? "Cập nhật" : type === "chi" ? "Ghi khoản chi" : "Ghi khoản thu"}
        </button>
      </div>

      {recent.length > 0 && (
        <div>
          <div style={styles.sectionTitle}>Vừa nhập gần đây</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((t) => (
              <TxRow key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ t, onEdit, onDelete, compact }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const Icon = getCatIcon(t.category);
  const catColor = getCatColor(t.category);
  return (
    <div style={styles.txRow}>
      <div style={{ ...styles.txIconBadge, background: `${catColor}1E`, color: catColor }}>
        <Icon size={15} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.txCat}>
          {t.category}
          {t.isRecurring && <Repeat size={11} style={{ marginLeft: 5, verticalAlign: -1 }} color={INK_FADE} />}
        </div>
        <div style={styles.txMeta}>
          {new Date(t.date + "T00:00:00").toLocaleDateString("vi-VN")}
          {t.time ? ` · ${t.time}` : ""}
          {t.note ? ` · ${t.note}` : ""}
        </div>
      </div>
      <div style={{ ...styles.txAmount, color: t.type === "thu" ? SUCCESS : DANGER }}>
        {t.type === "thu" ? "+" : "-"}{fmt(t.amount)}
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: 4 }}>
          <button style={styles.iconBtn} onClick={() => onEdit(t)}><PenLine size={14} /></button>
          {confirmDel ? (
            <button style={{ ...styles.iconBtn, color: DANGER }} onClick={() => onDelete(t.id)}>
              <X size={14} />
            </button>
          ) : (
            <button style={styles.iconBtn} onClick={() => setConfirmDel(true)}><Trash2 size={14} /></button>
          )}
        </div>
      )}
    </div>
  );
}

function LedgerView({ transactions, onEdit, onDelete }) {
  const [filter, setFilter] = useState("all"); // all | thu | chi
  const list = transactions
    .filter((t) => filter === "all" || t.type === filter)
    .slice()
    .reverse();

  // group by date
  const groups = {};
  list.forEach((t) => {
    groups[t.date] = groups[t.date] || [];
    groups[t.date].push(t);
  });
  const dateKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  if (transactions.length === 0) {
    return <EmptyState text="Chưa có giao dịch nào. Sang mục Nhập để ghi khoản đầu tiên." />;
  }

  return (
    <div>
      <div style={styles.filterRow}>
        {["all", "thu", "chi"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipActive : {}) }}
          >
            {f === "all" ? "Tất cả" : f === "thu" ? "Thu" : "Chi"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {dateKeys.map((dk) => (
          <div key={dk}>
            <div style={styles.dateGroupLabel}>
              {new Date(dk + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groups[dk].map((t) => (
                <TxRow key={t.id} t={t} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportView({ reportMode, setReportMode, periodLabel, shiftPeriod, periodThu, periodChi, pieData, barData, categories }) {
  const balance = periodThu - periodChi;
  const catList = pieData.map((d) => d.name);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={styles.modeToggle}>
        {[["ngay", "Ngày"], ["thang", "Tháng"], ["nam", "Năm"]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setReportMode(k)}
            style={{ ...styles.modeBtn, ...(reportMode === k ? styles.modeBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={styles.periodRow}>
        <button style={styles.periodArrow} onClick={() => shiftPeriod(-1)}><ChevronLeft size={18} /></button>
        <div style={styles.periodLabel}>{periodLabel}</div>
        <button style={styles.periodArrow} onClick={() => shiftPeriod(1)}><ChevronRight size={18} /></button>
      </div>

      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Tổng thu</div>
          <div style={{ ...styles.statValue, color: SUCCESS }}>{fmt(periodThu)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Tổng chi</div>
          <div style={{ ...styles.statValue, color: DANGER }}>{fmt(periodChi)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Chênh lệch</div>
          <div style={{ ...styles.statValue, color: balance >= 0 ? INK : DANGER }}>
            {balance < 0 ? "-" : ""}{fmt(Math.abs(balance))}
          </div>
        </div>
      </div>

      {pieData.length > 0 ? (
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Cơ cấu chi tiêu theo danh mục</div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={colorFor(entry.name, catList)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${fmt(v)} đ`} contentStyle={{ fontFamily: SANS, fontSize: 13, borderRadius: 10, border: `1px solid ${LINE}` }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={styles.legendWrap}>
            {pieData.sort((a, b) => b.value - a.value).map((d) => (
              <div key={d.name} style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background: colorFor(d.name, catList) }} />
                <span style={{ flex: 1 }}>{d.name}</span>
                <span style={{ fontWeight: 600 }}>{fmt(d.value)} đ</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState text="Chưa có khoản chi nào trong kỳ này." />
      )}

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Xu hướng thu — chi</div>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={barData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke={LINE} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fontFamily: SANS, fill: INK_SOFT }} axisLine={{ stroke: LINE }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: SANS, fill: INK_SOFT }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000000 ? `${v/1000000}tr` : v} />
              <Tooltip formatter={(v) => `${fmt(v)} đ`} contentStyle={{ fontFamily: SANS, fontSize: 13, borderRadius: 10, border: `1px solid ${LINE}` }} />
              <Legend wrapperStyle={{ fontFamily: SANS, fontSize: 12 }} />
              <Bar dataKey="Thu" fill={SUCCESS} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Chi" fill={DANGER} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function BudgetView({ allCats, budgets, currentMonthKey, monthChiByCat, setBudgetFor }) {
  return (
    <div>
      <div style={styles.sectionTitle}>Ngân sách tháng {currentMonthKey.slice(5)}/{currentMonthKey.slice(0, 4)}</div>
      {allCats.length === 0 ? (
        <EmptyState text="Chưa có danh mục chi nào. Thêm danh mục ở mục Nhập trước." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {allCats.map((c) => {
            const key = `${currentMonthKey}:${c}`;
            const budget = budgets[key] || 0;
            const spent = monthChiByCat[c] || 0;
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const over = budget > 0 && spent > budget;
            const Icon = getCatIcon(c);
            const iconColor = getCatColor(c);
            return (
              <div key={c} style={styles.card}>
                <div style={styles.budgetHeader}>
                  <div style={styles.budgetCatName}>
                    <Icon size={16} strokeWidth={2} color={iconColor} style={{ marginRight: 6, verticalAlign: -3 }} />
                    {c}
                  </div>
                  {over && (
                    <div style={styles.overBadge}>
                      <AlertTriangle size={12} /> Vượt hạn mức
                    </div>
                  )}
                </div>
                <div style={styles.budgetInputRow}>
                  <span style={styles.budgetInputLabel}>Hạn mức</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Chưa đặt"
                    defaultValue={budget || ""}
                    onBlur={(e) => setBudgetFor(c, e.target.value)}
                    style={styles.budgetInput}
                  />
                  <span>đ</span>
                </div>
                {budget > 0 && (
                  <>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${pct}%`, background: over ? DANGER : INK }} />
                    </div>
                    <div style={styles.budgetSpentRow}>
                      <span>Đã chi <b>{fmt(spent)}</b> đ</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                  </>
                )}
                {budget === 0 && spent > 0 && (
                  <div style={styles.budgetSpentRow}>
                    <span>Đã chi <b>{fmt(spent)}</b> đ (chưa đặt hạn mức)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecurringView({
  rules, categories,
  rType, setRType, rAmount, setRAmount, rCat, setRCat, rFreq, setRFreq,
  rStartDate, setRStartDate, rNote, setRNote,
  showRecurringForm, setShowRecurringForm, editingRecurringId,
  handleRecurringSubmit, resetRecurringForm, startEditRecurring, deleteRecurring, toggleRecurringActive,
}) {
  const list = categories[rType] || [];

  const nextDueLabel = (r) => {
    const next = r.lastGenerated
      ? addPeriod(new Date(r.lastGenerated + "T00:00:00"), r.frequency)
      : new Date(r.startDate + "T00:00:00");
    return next.toLocaleDateString("vi-VN");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={styles.recurringIntro}>
        Khoản cố định sẽ tự động ghi vào sổ đúng ngày, không cần bạn nhập tay mỗi lần.
      </div>

      {!showRecurringForm && (
        <button style={styles.addRecurringBtn} onClick={() => { resetRecurringForm(); setShowRecurringForm(true); }}>
          <Plus size={16} /> Thêm khoản định kỳ
        </button>
      )}

      {showRecurringForm && (
        <div style={styles.card}>
          {editingRecurringId && (
            <div style={styles.editingBanner}>
              <PenLine size={14} />
              <span>Đang sửa khoản định kỳ</span>
              <button style={styles.cancelEditBtn} onClick={resetRecurringForm}><X size={14} /></button>
            </div>
          )}

          <div style={styles.typeToggle}>
            <button
              style={{ ...styles.typeBtn, ...(rType === "chi" ? styles.typeBtnActiveChi : {}) }}
              onClick={() => { setRType("chi"); setRCat(""); }}
            >
              <TrendingDown size={16} /> Chi
            </button>
            <button
              style={{ ...styles.typeBtn, ...(rType === "thu" ? styles.typeBtnActiveThu : {}) }}
              onClick={() => { setRType("thu"); setRCat(""); }}
            >
              <TrendingUp size={16} /> Thu
            </button>
          </div>

          <label style={styles.fieldLabel}>Số tiền mỗi lần</label>
          <div style={styles.amountRow}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={rAmount}
              onChange={(e) => setRAmount(e.target.value)}
              style={styles.amountInput}
            />
            <span style={styles.dongSuffix}>đ</span>
          </div>

          <label style={styles.fieldLabel}>Danh mục</label>
          <div style={styles.catGrid}>
            {list.map((c) => {
              const Icon = getCatIcon(c);
              const active = rCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setRCat(c)}
                  style={{
                    ...styles.catChip,
                    ...(active ? { background: INK, color: PAPER, borderColor: INK } : {}),
                  }}
                >
                  <Icon size={14} strokeWidth={2} color={active ? PAPER : getCatColor(c)} />
                  {c}
                </button>
              );
            })}
          </div>

          <label style={styles.fieldLabel}>Tần suất lặp lại</label>
          <div style={styles.modeToggle}>
            {[["ngay", "Hàng ngày"], ["thang", "Hàng tháng"], ["nam", "Hàng năm"]].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRFreq(k)}
                style={{ ...styles.modeBtn, ...(rFreq === k ? styles.modeBtnActive : {}) }}
              >
                {label}
              </button>
            ))}
          </div>

          <label style={styles.fieldLabel}>Bắt đầu từ ngày</label>
          <input
            type="date"
            value={rStartDate}
            onChange={(e) => setRStartDate(e.target.value)}
            style={styles.dateInput}
          />

          <label style={styles.fieldLabel}>Ghi chú (tuỳ chọn)</label>
          <input
            type="text"
            placeholder="VD: Tiền thuê nhà"
            value={rNote}
            onChange={(e) => setRNote(e.target.value)}
            style={styles.noteInput}
          />

          <button
            style={{ ...styles.submitBtn, background: rType === "chi" ? DANGER : SUCCESS }}
            onClick={handleRecurringSubmit}
          >
            {editingRecurringId ? "Cập nhật khoản định kỳ" : "Lưu khoản định kỳ"}
          </button>
        </div>
      )}

      {rules.length === 0 ? (
        <EmptyState text="Chưa có khoản định kỳ nào. Thêm khoản tiền nhà, lương, trả góp... để hệ thống tự ghi hộ bạn." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rules.map((r) => {
            const Icon = getCatIcon(r.category);
            const iconColor = getCatColor(r.category);
            return (
            <div key={r.id} style={{ ...styles.card, opacity: r.active ? 1 : 0.55 }}>
              <div style={styles.recurringRowTop}>
                <div>
                  <div style={styles.recurringCatName}>
                    <Icon size={16} strokeWidth={2} color={iconColor} style={{ marginRight: 6, verticalAlign: -3 }} />
                    {r.category}
                  </div>
                  <div style={styles.recurringMeta}>{FREQ_LABEL[r.frequency]} · Kế tiếp {nextDueLabel(r)}</div>
                  {r.note && <div style={styles.recurringMeta}>{r.note}</div>}
                </div>
                <div style={{ ...styles.recurringAmount, color: r.type === "thu" ? SUCCESS : DANGER }}>
                  {r.type === "thu" ? "+" : "-"}{fmt(r.amount)}
                </div>
              </div>
              <div style={styles.recurringActions}>
                <button style={styles.recurringActionBtn} onClick={() => toggleRecurringActive(r.id)}>
                  <Power size={13} /> {r.active ? "Tạm dừng" : "Bật lại"}
                </button>
                <button style={styles.recurringActionBtn} onClick={() => startEditRecurring(r)}>
                  <PenLine size={13} /> Sửa
                </button>
                <button style={{ ...styles.recurringActionBtn, color: DANGER }} onClick={() => deleteRecurring(r.id)}>
                  <Trash2 size={13} /> Xoá
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.navBtn, color: active ? INK : INK_FADE }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function EmptyState({ text }) {
  return (
    <div style={styles.emptyState}>
      <Calendar size={28} color={INK_FADE} strokeWidth={1.5} />
      <div style={styles.emptyText}>{text}</div>
    </div>
  );
}

// ================= Design tokens: "Ngân hàng tin cậy" =================
const NAVY = "#16233F";        // xanh navy đậm — nền header, thương hiệu chính
const NAVY_SOFT = "#2A3B5C";   // navy nhạt hơn cho viền/chi tiết trên nền navy
const MINT = "#3FAE8A";        // bạc hà — điểm nhấn tươi cho khoản thu
const MINT_DEEP = "#1F7A5C";   // bạc hà đậm — dùng cho chữ số cần độ tương phản
const GOLD = "#C9963B";        // vàng đồng — điểm nhấn CTA, nổi bật trên nền navy
const PAPER = "#F3F6FA";       // nền chính toàn app — trắng ngà mát
const PAPER_RAISED = "#FFFFFF";// nền thẻ/card
const INK = NAVY;              // màu chữ chính, tiêu đề
const INK_SOFT = "#5C6C86";    // chữ phụ
const INK_FADE = "#9AA8BE";    // chữ mờ, nhãn phụ
const LINE = "#DDE4ED";        // viền, đường phân cách
const DANGER = "#C1443D";      // đỏ — khoản chi, cảnh báo
const DANGER_ON_DARK = "#FF8A75"; // đỏ sáng hơn, dùng trên nền navy tối để đủ tương phản
const SUCCESS = MINT_DEEP;     // xanh bạc hà đậm — khoản thu, số dương
const BG = PAPER;
const SERIF = "'Fraunces', Georgia, serif";
const SANS = "'Inter', -apple-system, sans-serif";

const fontImport = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
input:focus, button:focus { outline: 2px solid ${INK}; outline-offset: 1px; }
input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
* { box-sizing: border-box; }
`;

const styles = {
  app: {
    minHeight: "100vh",
    background: BG,
    fontFamily: SANS,
    color: INK,
    display: "flex",
    flexDirection: "column",
    maxWidth: 480,
    margin: "0 auto",
    position: "relative",
  },
  header: {
    padding: "26px 20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    background: NAVY,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    boxShadow: "0 6px 20px rgba(22,35,63,0.18)",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: "0.12em",
    color: "#7E93BC",
    fontWeight: 600,
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 13,
    color: "#A6B7D4",
    marginBottom: 2,
  },
  balanceValue: {
    fontFamily: SERIF,
    fontSize: 34,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.1,
  },
  dong: {
    fontSize: 18,
    fontWeight: 500,
    color: "#8FA2C4",
  },
  exportBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: GOLD,
    color: NAVY,
    border: "none",
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 4,
    whiteSpace: "nowrap",
  },
  main: {
    flex: 1,
    padding: "20px 16px 100px",
    overflowY: "auto",
  },
  card: {
    background: PAPER_RAISED,
    border: `1px solid ${LINE}`,
    borderRadius: 16,
    padding: 18,
  },
  editingBanner: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#E4EAF3",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 14,
    color: INK,
  },
  cancelEditBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: INK_SOFT,
    display: "flex",
  },
  typeToggle: {
    display: "flex",
    gap: 8,
    marginBottom: 18,
  },
  typeBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "11px 0",
    borderRadius: 10,
    border: `1.5px solid ${LINE}`,
    background: "transparent",
    color: INK_SOFT,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  typeBtnActiveChi: {
    background: DANGER,
    borderColor: DANGER,
    color: "#FFF3F1",
  },
  typeBtnActiveThu: {
    background: SUCCESS,
    borderColor: SUCCESS,
    color: "#F0FBF6",
  },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: INK_SOFT,
    marginBottom: 8,
    marginTop: 16,
  },
  amountRow: {
    display: "flex",
    alignItems: "baseline",
    borderBottom: `2px solid ${INK}`,
    paddingBottom: 6,
  },
  amountInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: 600,
    color: INK,
    outline: "none",
    minWidth: 0,
  },
  dongSuffix: {
    fontSize: 18,
    color: INK_SOFT,
    fontWeight: 500,
  },
  catGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  catChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 20,
    border: `1.5px solid ${LINE}`,
    background: "transparent",
    color: INK,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  catChipAdd: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 14px",
    borderRadius: 20,
    border: `1.5px dashed ${INK_FADE}`,
    background: "transparent",
    color: INK_SOFT,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  newCatRow: {
    display: "flex",
    gap: 8,
    marginTop: 10,
  },
  newCatInput: {
    flex: 1,
    padding: "9px 12px",
    borderRadius: 8,
    border: `1.5px solid ${LINE}`,
    fontSize: 13,
    fontFamily: SANS,
    background: PAPER,
  },
  newCatSave: {
    padding: "9px 16px",
    borderRadius: 8,
    border: "none",
    background: INK,
    color: PAPER_RAISED,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  dateInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1.5px solid ${LINE}`,
    fontSize: 14,
    fontFamily: SANS,
    background: PAPER,
    color: INK,
  },
  noteInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1.5px solid ${LINE}`,
    fontSize: 14,
    fontFamily: SANS,
    background: PAPER,
    color: INK,
  },
  submitBtn: {
    width: "100%",
    marginTop: 22,
    padding: "14px 0",
    borderRadius: 12,
    border: "none",
    color: "#F6F9FC",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.01em",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: INK,
    marginBottom: 12,
    fontFamily: SERIF,
    letterSpacing: "0.01em",
  },
  txRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: PAPER_RAISED,
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    padding: "12px 14px",
  },
  txIconBadge: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  txCat: {
    fontSize: 14,
    fontWeight: 600,
    color: INK,
  },
  txMeta: {
    fontSize: 11.5,
    color: INK_FADE,
    marginTop: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 700,
    fontFamily: SERIF,
    whiteSpace: "nowrap",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: INK_FADE,
    cursor: "pointer",
    padding: 4,
    display: "flex",
  },
  filterRow: {
    display: "flex",
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    padding: "7px 16px",
    borderRadius: 20,
    border: `1.5px solid ${LINE}`,
    background: "transparent",
    color: INK_SOFT,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  filterChipActive: {
    background: INK,
    borderColor: INK,
    color: PAPER_RAISED,
  },
  dateGroupLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: INK_SOFT,
    marginBottom: 8,
    textTransform: "capitalize",
  },
  modeToggle: {
    display: "flex",
    gap: 6,
    background: "#E4EAF3",
    borderRadius: 10,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    padding: "8px 0",
    borderRadius: 8,
    border: "none",
    background: "transparent",
    color: INK_SOFT,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  modeBtnActive: {
    background: PAPER_RAISED,
    color: INK,
    boxShadow: "0 1px 2px rgba(38,54,47,0.1)",
  },
  periodRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  periodArrow: {
    background: PAPER_RAISED,
    border: `1px solid ${LINE}`,
    borderRadius: 8,
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: INK,
  },
  periodLabel: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: 600,
    color: INK,
    textTransform: "capitalize",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  statCard: {
    background: PAPER_RAISED,
    border: `1px solid ${LINE}`,
    borderRadius: 12,
    padding: "12px 10px",
  },
  statLabel: {
    fontSize: 11,
    color: INK_SOFT,
    marginBottom: 4,
  },
  statValue: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: 700,
  },
  legendWrap: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: INK,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    flexShrink: 0,
  },
  budgetHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  budgetCatName: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: 600,
    color: INK,
  },
  overBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: DANGER,
    background: "#FBE4E1",
    padding: "3px 8px",
    borderRadius: 20,
  },
  budgetInputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  budgetInputLabel: {
    fontSize: 12,
    color: INK_SOFT,
    whiteSpace: "nowrap",
  },
  budgetInput: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 8,
    border: `1.5px solid ${LINE}`,
    fontSize: 13,
    fontFamily: SANS,
    background: PAPER,
    color: INK,
  },
  progressTrack: {
    height: 8,
    borderRadius: 20,
    background: "#E4EAF3",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 20,
    transition: "width 0.3s ease",
  },
  budgetSpentRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: INK_SOFT,
    marginTop: 6,
  },
  nav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    display: "flex",
    background: PAPER_RAISED,
    borderTop: `1px solid ${LINE}`,
    padding: "10px 0 max(10px, env(safe-area-inset-bottom))",
  },
  navBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "6px 0",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "40px 20px",
    color: INK_FADE,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    color: INK_SOFT,
    maxWidth: 240,
  },
  recurringIntro: {
    fontSize: 13,
    color: INK_SOFT,
    lineHeight: 1.5,
  },
  addRecurringBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "13px 0",
    borderRadius: 12,
    border: `1.5px dashed ${INK_FADE}`,
    background: "transparent",
    color: INK,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  recurringRowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  recurringCatName: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: 600,
    color: INK,
  },
  recurringMeta: {
    fontSize: 12,
    color: INK_FADE,
    marginTop: 3,
  },
  recurringAmount: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  recurringActions: {
    display: "flex",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${LINE}`,
  },
  recurringActionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: 8,
    border: `1px solid ${LINE}`,
    background: "transparent",
    color: INK_SOFT,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    bottom: 90,
    left: "50%",
    transform: "translateX(-50%)",
    background: INK,
    color: PAPER_RAISED,
    padding: "10px 18px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 16px rgba(38,54,47,0.25)",
    zIndex: 50,
  },
};
