import React, { useState, useEffect, useCallback, ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Icon } from "@iconify/react";
import { supabase } from "../../supabaseClient";
import { TooltipProps } from "recharts";
import toast from "react-hot-toast";

// --- Interfaces para los datos y props ---
interface DailySale {
  name: string;
  Ventas: number;
  Meta: number;
}
interface TopClient {
  name: string;
  value: string;
  percentage: number;
}
interface TopProvider {
  name: string;
  value: string;
}
interface TopProduct {
  name: string;
  value: string;
  stock?: number | null;
}
interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}
interface DashboardData {
  pendingReceivable: number;
  overdueReceivableCount: number;
  overduePayableCount: number;
  pendingPayable: number;
  paymentsThisMonth: number;
  dailySales: DailySale[];
  topClients: TopClient[];
  topProducts: TopProduct[];
  topProviders: TopProvider[];
  receivableStatusDistribution: StatusDistribution[];
  payableStatusDistribution: StatusDistribution[];
}
interface PremiumMetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend: "up" | "down" | "neutral";
  trendValue: string;
  colorScheme: "blue" | "amber" | "green" | "red" | "purple";
  delay?: number;
}
interface ChartProps<T> {
  title: string;
  data: T[];
  delay?: number;
}
interface PremiumListProps<T> {
  title: string;
  items: T[];
  icon: ReactNode;
}

// efecto de glow azul debajo al hacer hover (como en inventario)
const inventoryHoverGlow = "0 25px 50px -12px rgba(14,165,233,0.25), 0 0 30px rgba(14,165,233,0.35)";
// transición compartida igual a la de las tarjetas métricas
const hoverTransition = { duration: 0.2, ease: "easeOut" };

// --- Componentes Visuales ---
const PremiumMetricCard = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  colorScheme,
  delay = 0
}: PremiumMetricCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const gradients: Record<typeof colorScheme, string> = {
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-orange-500",
    green: "from-emerald-500 to-green-600",
    red: "from-red-500 to-rose-600",
    purple: "from-purple-500 to-indigo-600"
  };

  return (
    <motion.div
      className="relative overflow-hidden bg-white rounded-2xl shadow-lg transition-all duration-500 group cursor-pointer"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: delay * 0.2, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: inventoryHoverGlow,
        transition: hoverTransition
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradients[colorScheme]} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
      />
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-50 rounded-full opacity-20" />
      <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-blue-100 rounded-full opacity-30" />
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <motion.p
              className="text-3xl font-bold text-slate-800"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {value}
            </motion.p>
          </div>
          <motion.div
            className={`p-3 rounded-xl bg-gradient-to-br ${gradients[colorScheme]} text-white shadow-lg`}
            animate={{ rotate: isHovered ? 360 : 0, scale: isHovered ? 1.1 : 1 }}
            transition={{ duration: 0.5 }}
          >
            {icon}
          </motion.div>
        </div>
        <div className="flex items-center gap-2">
          <motion.div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend === "up"
                ? "bg-green-50 text-green-700"
                : trend === "down"
                ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-700"
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay * 0.3 + 0.5 }}
          >
            <Icon
              icon={
                trend === "up"
                  ? "lucide:trending-up"
                  : trend === "down"
                  ? "lucide:trending-down"
                  : "lucide:minus"
              }
              width={12}
              height={12}
            />
            {trendValue}
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
        <motion.div
          className={`h-full bg-gradient-to-r ${gradients[colorScheme]}`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? "100%" : "70%" }}
          transition={{ duration: 1, delay: delay * 0.2 }}
        />
      </div>
    </motion.div>
  );
};

const AdvancedChart = ({ title, data }: ChartProps<DailySale>) => {
  const CustomTooltip = ({
    active,
    payload,
    label
  }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-blue-100"
      >
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-slate-600">
              {entry.name}:{" "}
              <span className="font-semibold">
                ₡{entry.value?.toLocaleString()}
              </span>
            </span>
          </div>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      className="relative overflow-hidden bg-white rounded-2xl p-6 transition-all group cursor-pointer"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: inventoryHoverGlow,
        transition: hoverTransition
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        <button className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
          <Icon icon="lucide:download" width={16} height={16} />
        </button>
      </div>
      <div style={{ height: "320px", width: "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickFormatter={(v) => `₡${v / 1000}k`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="Meta"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorMeta)"
              strokeDasharray="5 5"
            />
            <Area
              type="monotone"
              dataKey="Ventas"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorVentas)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const StatusDonut = ({ title, data, delay = 0 }: ChartProps<StatusDistribution>) => {
  const [pieKey, setPieKey] = useState(0);
  const controls = useAnimation();
  const [inViewRef, inView] = useInView({ threshold: 0.3, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.6, delay: delay * 0.2, ease: "easeOut" }
      });
    }
  }, [controls, inView, delay]);

  return (
    <motion.div
      ref={inViewRef}
      className="relative flex flex-col overflow-hidden bg-white rounded-2xl p-6 transition-all group cursor-pointer"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={controls}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: inventoryHoverGlow,
        transition: hoverTransition
      }}
      onHoverStart={() => setPieKey((prev) => prev + 1)}
    >
      <motion.h3 className="text-xl font-bold text-slate-800 mb-4 text-center">
        {title}
      </motion.h3>
      <div className="flex-grow w-full h-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart key={pieKey}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              paddingAngle={5}
              dataKey="value"
              isAnimationActive
              animationDuration={600}
              animationEasing="ease-out"
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v}%`, "Porcentaje"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-2">
        {data.map((item, idx) => (
          <motion.div
            key={item.name}
            className="flex items-center justify-between p-2 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05, duration: 0.3, ease: "easeOut" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{item.value}%</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const PremiumList = ({ title, items, icon }: PremiumListProps<TopClient | TopProduct | TopProvider>) => {
  return (
    <motion.div
      className="relative overflow-hidden bg-white rounded-2xl p-6 transition-all group cursor-pointer"
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: inventoryHoverGlow,
        transition: hoverTransition
      }}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-blue-50 text-blue-600">{icon}</div>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <motion.div
            key={idx}
            className="group flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 transition-all duration-300 cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-sm text-slate-500 truncate">{item.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default function ElegantDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [payableResult, receivableResult, paymentsResult, providersResult, clientsResult, productsResult] =
        await Promise.all([
          supabase.from("facturas_proveedor").select("proveedor_id, total, saldo_pendiente, estado"),
          supabase
            .from("facturas")
            .select("total_factura, estado, fecha_emision, plazo_credito, detalle, cliente_id"),
          supabase
            .from("pagos_proveedor")
            .select("monto_total")
            .gte("fecha_pago", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from("providers").select("id, nombre"),
          supabase.from("clientes").select("id, nombre"),
          supabase.from("productos").select("id, nombre, stock")
        ]);
      if (payableResult.error) throw payableResult.error;
      if (receivableResult.error) throw receivableResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (providersResult.error) throw providersResult.error;
      if (clientsResult.error) throw clientsResult.error;
      if (productsResult.error) throw productsResult.error;

      const payableData = payableResult.data;
      const receivableData = receivableResult.data;

      const pendingPayable = payableData.reduce((sum, bill) => {
        return sum + (["Pendiente", "Vencida", "Parcial"].includes(bill.estado) ? bill.saldo_pendiente || 0 : 0);
      }, 0);
      const overduePayableCount = payableData.filter((b) => b.estado === "Vencida").length;

      const paymentsThisMonth = paymentsResult.data.reduce((sum, p) => sum + p.monto_total, 0);

      const pendingReceivable = receivableData
        .filter((f) => ["Pendiente", "Vencida"].includes(f.estado))
        .reduce((sum, f) => sum + f.total_factura, 0);
      const overdueReceivableCount = receivableData.filter((f) => f.estado === "Vencida").length;

      const totalInvoices = receivableData.length;
      const statusCounts = receivableData.reduce((acc: Record<string, number>, f) => {
        acc[f.estado] = (acc[f.estado] || 0) + 1;
        return acc;
      }, {});
      const receivableStatusDistribution = totalInvoices
        ? [
            { name: "Pagadas", value: Math.round((statusCounts["Pagada"] || 0) / totalInvoices * 100), color: "#10b981" },
            { name: "Pendientes", value: Math.round((statusCounts["Pendiente"] || 0) / totalInvoices * 100), color: "#f59e0b" },
            { name: "Vencidas", value: Math.round((statusCounts["Vencida"] || 0) / totalInvoices * 100), color: "#ef4444" }
          ].filter((i) => i.value > 0)
        : [];

      const totalPayableCount = payableData.length;
      const payCounts = payableData.reduce((acc: Record<string, number>, b) => {
        acc[b.estado] = (acc[b.estado] || 0) + 1;
        return acc;
      }, {});
      const payableStatusDistribution = totalPayableCount
        ? [
            { name: "Pagadas", value: Math.round((payCounts["Pagada"] || 0) / totalPayableCount * 100), color: "#10b981" },
            { name: "Pendientes", value: Math.round((payCounts["Pendiente"] || 0) / totalPayableCount * 100), color: "#f59e0b" },
            { name: "Parcial", value: Math.round((payCounts["Parcial"] || 0) / totalPayableCount * 100), color: "#3b82f6" },
            { name: "Vencidas", value: Math.round((payCounts["Vencida"] || 0) / totalPayableCount * 100), color: "#ef4444" }
          ].filter((i) => i.value > 0)
        : [];

      const salesByDay = receivableData.reduce((acc: Record<string, number>, f) => {
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
        const day = dayNames[new Date(f.fecha_emision).getUTCDay()];
        acc[day] = (acc[day] || 0) + f.total_factura;
        return acc;
      }, {});
      const dailySales: DailySale[] = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => ({
        name: d,
        Ventas: salesByDay[d] || 0,
        Meta: 150000
      }));

      const clientMap = new Map(clientsResult.data.map((c) => [c.id, c.nombre] as const));
      const salesByClient = receivableData.reduce((acc: Record<number, number>, f) => {
        if (f.cliente_id) acc[f.cliente_id] = (acc[f.cliente_id] || 0) + f.total_factura;
        return acc;
      }, {});
      const topClients: TopClient[] = Object.entries(salesByClient)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, total]) => ({
          name: clientMap.get(Number(id)) || "Desconocido",
          value: `₡${total.toLocaleString()}`,
          percentage: 0
        }));

      const productMap = new Map(
        productsResult.data.map((p) => [p.id, { name: p.nombre, stock: p.stock }] as const)
      );
      const salesByProduct = receivableData.reduce((acc: Record<number, number>, f) => {
        try {
          JSON.parse(f.detalle || "[]").forEach((d: any) => {
            if (d.producto_id && d.cantidad) acc[d.producto_id] = (acc[d.producto_id] || 0) + Number(d.cantidad);
          });
        } catch {}
        return acc;
      }, {});
      const topProducts: TopProduct[] = Object.entries(salesByProduct)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, sold]) => ({
          name: productMap.get(Number(id))?.name || "Desconocido",
          value: `${sold} vendidos | Stock: ${productMap.get(Number(id))?.stock ?? "N/A"}`,
          stock: productMap.get(Number(id))?.stock ?? null
        }));

      const providerMap = new Map(providersResult.data.map((p) => [p.id, p.nombre] as const));
      const totalByProvider = payableData.reduce((acc: Record<number, number>, b) => {
        if (b.proveedor_id) acc[b.proveedor_id] = (acc[b.proveedor_id] || 0) + b.total;
        return acc;
      }, {});
      const topProviders: TopProvider[] = Object.entries(totalByProvider)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, total]) => ({
          name: providerMap.get(Number(id)) || "Desconocido",
          value: `₡${total.toLocaleString()}`
        }));

      setDashboardData({
        pendingReceivable,
        overdueReceivableCount,
        overduePayableCount,
        pendingPayable,
        paymentsThisMonth,
        dailySales,
        topClients,
        topProducts,
        topProviders,
        receivableStatusDistribution,
        payableStatusDistribution
      });
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al cargar datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading || !dashboardData) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mb-4"
        />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-600 font-medium">
          Cargando dashboard...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent">
              Panel Ejecutivo
            </h1>
            <p className="text-slate-600 mt-2 text-lg">
              Análisis integral del rendimiento empresarial
            </p>
          </div>
        </div>
      </motion.header>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <PremiumMetricCard
          title="Pendiente por Cobrar"
          value={`₡${dashboardData.pendingReceivable.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Icon icon="lucide:trending-up" width={24} height={24} />}
          trend="up"
          trendValue=""
          colorScheme="blue"
          delay={0}
        />
        <PremiumMetricCard
          title="Facturas Vencidas"
          value={dashboardData.overdueReceivableCount + dashboardData.overduePayableCount}
          icon={<Icon icon="lucide:alert-triangle" width={24} height={24} />}
          trend="neutral"
          trendValue={`Clientes: ${dashboardData.overdueReceivableCount} | Prov: ${dashboardData.overduePayableCount}`}
          colorScheme="red"
          delay={1}
        />
        <PremiumMetricCard
          title="Pendiente por Pagar"
          value={`₡${dashboardData.pendingPayable.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Icon icon="lucide:clock" width={24} height={24} />}
          trend="neutral"
          trendValue=""
          colorScheme="amber"
          delay={2}
        />
        <PremiumMetricCard
          title="Pagos del Mes"
          value={`₡${dashboardData.paymentsThisMonth.toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Icon icon="lucide:check-circle-2" width={24} height={24} />}
          trend="up"
          trendValue=""
          colorScheme="green"
          delay={3}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <AdvancedChart title="Rendimiento de Ventas vs Meta" data={dashboardData.dailySales} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          <StatusDonut title="Estado Cuentas por Cobrar" data={dashboardData.receivableStatusDistribution} delay={0} />
          <StatusDonut title="Estado Cuentas por Pagar" data={dashboardData.payableStatusDistribution} delay={1} />
        </div>
      </div>

      {/* Listas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <PremiumList
          title="Principales Clientes"
          items={dashboardData.topClients}
          icon={<Icon icon="lucide:users" width={20} height={20} />}
        />
        <PremiumList
          title="Productos Destacados"
          items={dashboardData.topProducts}
          icon={<Icon icon="lucide:package" width={20} height={20} />}
        />
        <PremiumList
          title="Proveedores Destacados"
          items={dashboardData.topProviders}
          icon={<Icon icon="lucide:truck" width={20} height={20} />}
        />
      </div>
    </div>
  );
}