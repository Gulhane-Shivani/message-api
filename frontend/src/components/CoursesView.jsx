import { useState, useEffect } from 'react';
import { api } from '../api.js';
import {
  BookOpen, Calendar, CheckCircle, Loader, AlertCircle,
  ArrowRight, Users, Sparkles, GraduationCap
} from 'lucide-react';

export default function CoursesView({ currentUser, onViewCommunity }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null); // course id being enrolled
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getCourses();
      setCourses(data);
    } catch (e) {
      setError(e.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []);

  const handleEnroll = async (course) => {
    setEnrolling(course.id);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.enrollCourse(course.id);
      setSuccessMsg(`🎉 You joined "${course.name}"! Head to the community.`);
      await fetchCourses(); // refresh is_enrolled flags
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (e) {
      setError(e.message || 'Enrollment failed.');
    } finally {
      setEnrolling(null);
    }
  };

  const enrolled = courses.filter(c => c.is_enrolled);
  const available = courses.filter(c => !c.is_enrolled);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">My Courses</h1>
              <p className="text-xs text-slate-400 font-medium">Browse available batches and join your course community</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-10">

          {/* Alerts */}
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 text-sm rounded-xl flex items-center gap-2.5 border border-rose-100 dark:border-rose-900/30">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 text-sm rounded-xl flex items-center gap-2.5 border border-emerald-100 dark:border-emerald-900/30">
              <CheckCircle size={16} /> <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader className="animate-spin text-indigo-600" size={30} />
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-gray-950 p-8">
              <BookOpen size={36} className="text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-white">No courses available yet</h3>
              <p className="text-xs text-slate-400 mt-1">Ask your admin to add batch courses.</p>
            </div>
          ) : (
            <>
              {/* Enrolled Courses */}
              {enrolled.length > 0 && (
                <section>
                  <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-500" />
                    Enrolled Batches ({enrolled.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {enrolled.map(course => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        enrolling={enrolling}
                        onEnroll={handleEnroll}
                        onViewCommunity={onViewCommunity}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Available Courses */}
              {available.length > 0 && (
                <section>
                  <h2 className="text-sm font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-500" />
                    Available Batches ({available.length})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {available.map(course => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        enrolling={enrolling}
                        onEnroll={handleEnroll}
                        onViewCommunity={onViewCommunity}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CourseCard({ course, enrolling, onEnroll, onViewCommunity }) {
  const isEnrolling = enrolling === course.id;

  return (
    <div className={`bg-white dark:bg-gray-950 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col
      ${course.is_enrolled
        ? 'border-emerald-200 dark:border-emerald-900/40 ring-1 ring-emerald-500/10'
        : 'border-slate-200 dark:border-slate-850'
      }`}
    >
      {/* Course Color Banner */}
      <div className={`h-2 w-full ${course.is_enrolled ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-violet-600'}`} />

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-3">
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-lg">
            {course.batch_code || 'NO CODE'}
          </span>
          {course.is_enrolled && (
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-full">
              <CheckCircle size={10} /> Enrolled
            </span>
          )}
        </div>

        <h3 className="text-sm font-extrabold text-slate-850 dark:text-white mb-1.5 line-clamp-2">{course.name}</h3>
        <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-3 flex-1 mb-4">
          {course.description || 'No description available.'}
        </p>

        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850">
          {/* Date */}
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Calendar size={12} />
            <span>
              {course.start_date ? new Date(course.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
              {' — '}
              {course.end_date ? new Date(course.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Ongoing'}
            </span>
          </div>

          {/* Action Buttons */}
          {course.is_enrolled ? (
            <button
              onClick={() => onViewCommunity({ id: course.community_id, name: course.community_name })}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-xs font-bold transition-all group border border-indigo-100/50 dark:border-indigo-900/30"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={13} />
                Open Community
              </span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => onEnroll(course)}
              disabled={isEnrolling}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-60"
            >
              {isEnrolling ? (
                <><Loader size={13} className="animate-spin" /> Enrolling...</>
              ) : (
                <><Users size={13} /> Enroll Now</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
