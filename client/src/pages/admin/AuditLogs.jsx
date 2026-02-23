import React, { useState, useEffect } from "react";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Info,
  Loader2,
  Filter,
  ChevronDown,
} from "lucide-react";

const severityConfig = {
  low: { color: "bg-blue-100 text-blue-700", icon: Info },
  medium: { color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  high: { color: "bg-red-100 text-red-700", icon: Shield },
  critical: { color: "bg-red-200 text-red-800", icon: Shield },
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  useEffect(() => {
    fetchLogs();
  }, [filterAction, filterSeverity]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getLogs();
      const logsList = data?.data?.logs || data?.logs || data || [];
      setLogs(Array.isArray(logsList) ? logsList : []);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction && !log.action?.includes(filterAction)) return false;
    if (filterSeverity && log.severity !== filterSeverity) return false;
    return true;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="text-sm text-slate-500 mt-1">
                Track all admin actions across the platform
              </p>
            </div>
          </div>
          <span className="text-sm text-slate-400">
            {filteredLogs.length} entries
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          <div className="relative">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-3 text-slate-400 pointer-events-none"
            />
          </div>
          {(filterAction || filterSeverity) && (
            <button
              onClick={() => {
                setFilterAction("");
                setFilterSeverity("");
              }}
              className="text-sm text-blue-600 font-medium hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Log Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <span className="ml-3 text-slate-600">Loading logs...</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Performed By
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.map((log, idx) => {
                    const sev =
                      severityConfig[log.severity] || severityConfig.low;
                    const SevIcon = sev.icon;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-25 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900">
                            {log.action?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-600">
                            {log.performedBy?.name ||
                              log.performedBy?.email ||
                              "System"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500">
                            {log.targetType || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${sev.color}`}
                          >
                            <SevIcon size={12} />
                            {log.severity || "low"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString()
                              : "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        No audit logs found
                        {filterAction || filterSeverity
                          ? " for the selected filters"
                          : ""}
                        .
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
