import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Bell } from 'lucide-react';

export const Page2: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass rounded-2xl p-12 text-center max-w-md w-full"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
          <LayoutGrid className="w-9 h-9 text-blue-400" />
        </div>
        <h2 className="font-sora text-2xl font-bold text-white mb-3">Batch Processor</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Process hundreds of addresses simultaneously with our bulk normalization engine. 
          Upload CSV files, track progress, and download enriched results.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
          <Bell className="w-4 h-4" />
          Coming Soon
        </div>
        <p className="text-slate-600 text-xs mt-4">
          You'll be notified when this feature launches.
        </p>
      </motion.div>
    </div>
  );
};
