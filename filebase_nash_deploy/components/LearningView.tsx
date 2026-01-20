
import React, { useState } from 'react';
import { Course } from '../types';
import { GraduationCap, Plus, PlayCircle, CheckCircle, Clock, Award, BookOpen, ChevronRight } from 'lucide-react';

const LearningView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([
    { id: '1', title: 'Advanced Machine Learning', platform: 'Coursera', progress: 65, totalLessons: 24, completedLessons: 16, category: 'Tech', nextLessonDate: '2023-11-20' },
    { id: '2', title: 'Financial Strategy for Execs', platform: 'LinkedIn Learning', progress: 30, totalLessons: 10, completedLessons: 3, category: 'Business', nextLessonDate: '2023-11-21' },
    { id: '3', title: 'Modern Web Architecture', platform: 'Udemy', progress: 100, totalLessons: 45, completedLessons: 45, category: 'Tech' },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Learning Center</h2>
          <p className="text-slate-500">Track your skills growth and upcoming certifications.</p>
        </div>
        <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
          <Plus size={20} /> Add Course
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><BookOpen size={24} /></div>
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Courses</p>
             <h3 className="text-xl font-bold text-slate-800">{courses.filter(c => c.progress < 100).length} Enrolled</h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Award size={24} /></div>
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certificates</p>
             <h3 className="text-xl font-bold text-slate-800">{courses.filter(c => c.progress === 100).length} Earned</h3>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
           <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Clock size={24} /></div>
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Study</p>
             <h3 className="text-xl font-bold text-slate-800">8.5 Hours</h3>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <PlayCircle className="text-blue-500" size={20} /> Continue Learning
           </h3>
           <div className="space-y-4">
              {courses.filter(c => c.progress < 100).map(course => (
                <div key={course.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase mb-2 inline-block">
                          {course.category}
                        </span>
                        <h4 className="text-lg font-bold text-slate-800">{course.title}</h4>
                        <p className="text-sm text-slate-400">{course.platform}</p>
                      </div>
                      <div className="relative w-12 h-12 flex items-center justify-center">
                         <svg className="w-12 h-12 -rotate-90">
                           <circle cx="24" cy="24" r="20" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                           <circle cx="24" cy="24" r="20" fill="transparent" stroke="#3b82f6" strokeWidth="4" strokeDasharray={126} strokeDashoffset={126 - (126 * course.progress) / 100} strokeLinecap="round" />
                         </svg>
                         <span className="absolute text-[10px] font-black text-slate-700">{course.progress}%</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-center mt-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <CheckCircle size={14} className="text-blue-500" />
                        {course.completedLessons}/{course.totalLessons} Lessons
                      </div>
                      <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600 transition-all">
                        Resume <ChevronRight size={14} />
                      </button>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Award className="text-emerald-500" size={20} /> Completed & Archive
           </h3>
           <div className="space-y-3">
              {courses.filter(c => c.progress === 100).map(course => (
                <div key={course.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-transparent hover:border-slate-100 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Award size={20} />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-700">{course.title}</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{course.platform}</p>
                      </div>
                   </div>
                   <button className="text-blue-600 text-[11px] font-bold hover:underline">View Certificate</button>
                </div>
              ))}
           </div>

           <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl mt-8">
              <GraduationCap className="mb-4 text-purple-200" size={32} />
              <h4 className="text-xl font-bold mb-2">Skill Roadmap AI</h4>
              <p className="text-purple-100 text-xs leading-relaxed mb-6">
                "Based on your current tech courses, I recommend exploring 'Systems Design' next to complete your Senior Architect profile. There's a high-rated course on Coursera starting tomorrow."
              </p>
              <button className="w-full bg-white text-indigo-700 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 transition-all">
                Generate My Roadmap
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LearningView;
