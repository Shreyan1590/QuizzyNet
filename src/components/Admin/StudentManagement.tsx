import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { supabase } from "../../lib/supabase"; // Adjust the import path as needed
import { toast } from "react-hot-toast";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_blocked: boolean;
  tab_switch_count: number;
  last_activity: string;
  total_quizzes: number;
  average_score: number;
  status: "online" | "offline" | "in-quiz";
  created_at: string;
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();

    // Set up real-time subscription
    const subscription = supabase
      .channel("students_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => fetchStudents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, searchTerm, statusFilter]);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .neq("email", "admin@quiz.com")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStudents(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Error loading students");
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = students;

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.first_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "blocked") {
        filtered = filtered.filter((student) => student.is_blocked);
      } else if (statusFilter === "active") {
        filtered = filtered.filter((student) => !student.is_blocked);
      } else if (statusFilter === "violations") {
        filtered = filtered.filter((student) => student.tab_switch_count > 0);
      }
    }

    setFilteredStudents(filtered);
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

      toast.success(
        `Student ${!isBlocked ? "blocked" : "unblocked"} successfully`
      );
      fetchStudents(); // Refresh the student list
    } catch (error) {
      console.error("Error updating student status:", error);
      toast.error("Error updating student status");
    }
  };

  const getStatusColor = (student: Student) => {
    if (student.is_blocked) return "bg-red-100 text-red-800";
    if (student.status === "online") return "bg-green-100 text-green-800";
    if (student.status === "in-quiz") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", `%${searchTerm}%`)
    .order("created_at", { ascending: false });

  const getStatusIcon = (student: Student) => {
    if (student.is_blocked) return <Ban className="w-4 h-4" />;
    if (student.status === "online") return <CheckCircle className="w-4 h-4" />;
    if (student.status === "in-quiz") return <Clock className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Management
              </h1>
              <p className="mt-2 text-gray-600">
                Monitor and manage student accounts
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">
                {students.length} Students
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Students</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
                <option value="violations">With Violations</option>
              </select>
            </div>

            <div className="text-sm text-gray-600 flex items-center">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {student.first_name?.[0]}
                            {student.last_name?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          student
                        )}`}
                      >
                        {getStatusIcon(student)}
                        <span className="ml-1">
                          {student.is_blocked
                            ? "Blocked"
                            : student.status || "Offline"}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {student.tab_switch_count > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {student.tab_switch_count} violations
                          </span>
                        ) : (
                          <span className="text-green-600 text-sm">
                            Clean record
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>{student.total_quizzes || 0} quizzes</div>
                        <div className="text-xs text-gray-400">
                          {student.average_score || 0}% avg
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() =>
                          handleBlockStudent(student.id, student.is_blocked)
                        }
                        className={`inline-flex items-center ${
                          student.is_blocked
                            ? "text-green-600 hover:text-green-900"
                            : "text-red-600 hover:text-red-900"
                        }`}
                      >
                        {student.is_blocked ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <Ban className="w-4 h-4 mr-1" />
                            Block
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Details Modal */}
        {selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Student Details
                  </h3>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Name
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedStudent.first_name} {selectedStudent.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedStudent.email}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Phone
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedStudent.phone || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          selectedStudent
                        )}`}
                      >
                        {selectedStudent.is_blocked
                          ? "Blocked"
                          : selectedStudent.status || "Offline"}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Activity Summary
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedStudent.total_quizzes || 0}
                        </div>
                        <div className="text-sm text-blue-700">
                          Total Quizzes
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedStudent.average_score || 0}%
                        </div>
                        <div className="text-sm text-green-700">
                          Average Score
                        </div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {selectedStudent.tab_switch_count || 0}
                        </div>
                        <div className="text-sm text-red-700">Violations</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
