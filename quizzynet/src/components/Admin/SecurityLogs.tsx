import React, { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  Eye,
  Ban,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import { supabase } from "../../lib/supabase"; // Adjust the import path as needed
import { toast } from "react-hot-toast";

interface SecurityLog {
  id: string;
  student_id: string;
  student_email: string;
  type:
    | "tab_switch"
    | "right_click"
    | "fullscreen_exit"
    | "multiple_login"
    | "suspicious_activity";
  description: string;
  timestamp: string;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_blocked: boolean;
  tab_switch_count: number;
  last_activity: string;
}

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resolvedFilter, setResolvedFilter] = useState("all");

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, searchTerm, severityFilter, typeFilter, resolvedFilter]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .neq("email", "admin@quiz.com")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStudents(data || []);
      generateSecurityLogs(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Error loading student data");
    }
  };

  const generateSecurityLogs = (studentsData: Student[]) => {
    const securityLogs: SecurityLog[] = [];

    studentsData.forEach((student) => {
      if (student.tab_switch_count > 0) {
        securityLogs.push({
          id: `tab_${student.id}`,
          student_id: student.id,
          student_email: student.email,
          type: "tab_switch",
          description: `Student switched tabs ${student.tab_switch_count} times during quiz`,
          timestamp: student.last_activity || new Date().toISOString(),
          severity:
            student.tab_switch_count >= 3
              ? "critical"
              : student.tab_switch_count >= 2
              ? "high"
              : "medium",
          resolved: student.is_blocked,
        });
      }

      if (student.is_blocked) {
        securityLogs.push({
          id: `blocked_${student.id}`,
          student_id: student.id,
          student_email: student.email,
          type: "suspicious_activity",
          description: "Student account blocked due to security violations",
          timestamp: student.last_activity || new Date().toISOString(),
          severity: "critical",
          resolved: true,
        });
      }
    });

    // Sort by timestamp (most recent first)
    securityLogs.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setLogs(securityLogs);
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((log) => log.severity === severityFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((log) => log.type === typeFilter);
    }

    // Resolved filter
    if (resolvedFilter !== "all") {
      const isResolved = resolvedFilter === "resolved";
      filtered = filtered.filter((log) => log.resolved === isResolved);
    }

    setFilteredLogs(filtered);
  };

  const handleResolveLog = async (logId: string) => {
    try {
      // Update the log in state
      setLogs((prevLogs) =>
        prevLogs.map((log) =>
          log.id === logId ? { ...log, resolved: true } : log
        )
      );
      toast.success("Security log marked as resolved");
    } catch (error) {
      console.error("Error resolving log:", error);
      toast.error("Error resolving security log");
    }
  };

  const handleBlockStudent = async (studentId: string, isBlocked: boolean) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          is_blocked: !isBlocked,
          blocked_at: !isBlocked ? new Date().toISOString() : null,
        })
        .eq("id", studentId);

      if (error) throw error;

      // Refresh student data
      await fetchStudents();
      toast.success(
        `Student ${!isBlocked ? "blocked" : "unblocked"} successfully`
      );
    } catch (error) {
      console.error("Error updating student status:", error);
      toast.error("Error updating student status");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "medium":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "low":
        return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const fetchSecurityLogs = async () => {
    const { data, error } = await supabase
      .from("security_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  useEffect(() => {
    const subscription = supabase
      .channel("security_logs_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "security_logs",
        },
        () => fetchSecurityLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const { data, error } = await supabase
  .from('security_logs')
  .select('*')
  .range(0, 99) // First 100 records
  .order('timestamp', { ascending: false });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "tab_switch":
        return <Eye className="w-4 h-4" />;
      case "right_click":
        return <Ban className="w-4 h-4" />;
      case "fullscreen_exit":
        return <Shield className="w-4 h-4" />;
      case "multiple_login":
        return <AlertTriangle className="w-4 h-4" />;
      case "suspicious_activity":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading security logs...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: logs.length,
    critical: logs.filter((log) => log.severity === "critical").length,
    unresolved: logs.filter((log) => !log.resolved).length,
    blockedStudents: students.filter((student) => student.isBlocked).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Security Logs</h1>
          <p className="mt-2 text-gray-600">
            Monitor and manage security violations
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Critical Issues
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.critical}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unresolved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.unresolved}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <Ban className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Blocked Students
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.blockedStudents}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="tab_switch">Tab Switch</option>
              <option value="right_click">Right Click</option>
              <option value="fullscreen_exit">Fullscreen Exit</option>
              <option value="multiple_login">Multiple Login</option>
              <option value="suspicious_activity">Suspicious Activity</option>
            </select>

            <select
              value={resolvedFilter}
              onChange={(e) => setResolvedFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
            </select>

            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </div>

        {/* Security Logs Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  const student = students.find((s) => s.id === log.studentId);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(
                            log.severity
                          )}`}
                        >
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1 capitalize">
                            {log.severity}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(log.type)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {log.type.replace("_", " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {log.studentEmail}
                        </div>
                        {student && (
                          <div className="text-sm text-gray-500">
                            {student.firstName} {student.lastName}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp?.toDate
                          ? log.timestamp.toDate().toLocaleString()
                          : new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.resolved
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {log.resolved ? "Resolved" : "Unresolved"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        {!log.resolved && (
                          <button
                            onClick={() => handleResolveLog(log.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Resolve
                          </button>
                        )}
                        {student && (
                          <button
                            onClick={() =>
                              handleBlockStudent(student.id, student.isBlocked)
                            }
                            className={`${
                              student.isBlocked
                                ? "text-blue-600 hover:text-blue-900"
                                : "text-red-600 hover:text-red-900"
                            }`}
                          >
                            {student.isBlocked ? "Unblock" : "Block"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No security logs
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No security violations match your current filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityLogs;
