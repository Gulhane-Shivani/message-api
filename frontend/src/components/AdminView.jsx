import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { Plus, BookOpen, Calendar, Shield, ExternalLink, Sparkles, CheckCircle, AlertCircle, Loader, X } from 'lucide-react';

export default function AdminView({ currentUser, onViewCommunity }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminCourses();
      setCourses(data);
    } catch (e) {
      setError(e.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await api.createAdminCourse(
        name.trim(),
        description.trim(),
        batchCode.trim(),
        startDate,
        endDate
      );
      setSuccessMsg(`Successfully created "${name}" and generated default community "${res.community_name}"!`);
      
      // Reset form
      setName('');
      setBatchCode('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setShowAddModal(false);
      
      // Refresh list
      fetchCourses();
      
      // Auto clear success message
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg font-extrabold text-slate-850 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            Admin Portal
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Manage batch courses & automatic community workspaces</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all"
        >
          <Plus size={16} />
          Create Batch Course
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 text-xs rounded-xl flex items-center gap-2.5 border border-rose-100 dark:border-rose-900/30">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2.5 border border-emerald-100 dark:border-emerald-900/30">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : courses.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6 bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mb-4 text-indigo-600">
              <BookOpen size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">No Batch Courses Found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Get started by creating your first course. It will automatically build an interactive community channel.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Add Course Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded">
                      {course.batch_code || 'NO BATCH CODE'}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase ${
                      course.status === 'active' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' 
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-500'
                    }`}>
                      {course.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-850 dark:text-white mb-1.5 line-clamp-1">{course.name}</h3>
                  <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-3 mb-4">{course.description || 'No description available.'}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Calendar size={12} />
                    <span>
                      {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'TBD'}
                      {' - '}
                      {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>

                  {course.community_id && (
                    <button
                      onClick={() => onViewCommunity({ id: course.community_id, name: course.community_name })}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-[11px] font-bold transition-all border border-indigo-100/30"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={12} />
                        <span>Go to #{course.community_name}</span>
                      </span>
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-slate-850 rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-slide-up">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-650" />
              Create New Batch Course
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">Adding a course will automatically launch a linked public community space.</p>

            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course Name</label>
                <input
                  type="text" required
                  placeholder="e.g. Advanced UI/UX Design Boot Camp"
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Batch Code</label>
                <input
                  type="text"
                  placeholder="e.g. UX-2026-FALL"
                  value={batchCode} onChange={e => setBatchCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea
                  placeholder="Describe the topics covered in this batch course..."
                  value={description} onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 mt-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="animate-spin" size={14} />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <span>Launch Course & Community</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
