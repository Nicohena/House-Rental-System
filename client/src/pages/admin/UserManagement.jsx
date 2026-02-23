import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import adminService from "../../api/adminService";
import Navbar from "../../components/layout/Navbar";
import { useConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ListItemSkeleton } from "../../components/ui/Skeleton";
import UserEditModal from "../../components/admin/UserEditModal";
import logger from "../../utils/logger";
import { Edit2, Trash2, Users } from "lucide-react";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const { confirm, ConfirmDialog: ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err) {
      logger.error("Failed to fetch users", err);
      toast.error("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
  };

  const handleUserUpdated = (updatedUser) => {
    setUsers(users.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
    setEditingUser(null);
  };

  const handleDeleteUser = async (user) => {
    await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone, and all associated data will be permanently removed.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
      onConfirm: async () => {
        try {
          await adminService.deleteUser(user._id);
          setUsers(users.filter((u) => u._id !== user._id));
          toast.success(`User "${user.name}" deleted successfully.`);
          logger.info("User deleted", { userId: user._id });
        } catch (err) {
          logger.error("Failed to delete user", err);
          toast.error("Failed to delete user. Please try again.");
          throw err; // Re-throw to prevent dialog from closing
        }
      },
    });
  };

  const getRoleBadgeClass = (role) => {
    const baseClasses =
      "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (role) {
      case "admin":
        return `${baseClasses} bg-purple-100 text-purple-800`;
      case "owner":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              User Directory
            </h1>
            <p className="mt-2 text-gray-600">
              Manage user accounts and permissions
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-3xl font-bold text-blue-600">
              {users.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul
              className="divide-y divide-gray-200"
              role="status"
              aria-label="Loading users"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <ListItemSkeleton key={i} />
              ))}
            </ul>
          </div>
        ) : users.length > 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li
                  key={user._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 flex items-center sm:px-6">
                    <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                      <div className="truncate">
                        <div className="flex text-sm items-center gap-2">
                          <p className="font-medium text-blue-600 truncate">
                            {user.name}
                          </p>
                          <span className={getRoleBadgeClass(user.role)}>
                            {user.role}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-col sm:flex-row sm:gap-6">
                          <div className="flex items-center text-sm text-gray-500">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <span className="truncate">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <svg
                                className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                              >
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                              </svg>
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`Edit user: ${user.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </button>
                          {user.role !== "admin" && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                              aria-label={`Delete user: ${user.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white p-12 text-center rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Users className="h-full w-full" />
            </div>
            <p className="text-gray-500 text-lg">No users found</p>
            <p className="text-gray-400 text-sm mt-2">
              Users will appear here once they register
            </p>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      <UserEditModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onUserUpdated={handleUserUpdated}
      />

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
};

export default UserManagement;
