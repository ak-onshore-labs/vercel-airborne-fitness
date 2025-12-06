import MobileLayout from "@/components/layout/MobileLayout";
import { Calendar, ChevronRight, MessageSquare } from "lucide-react";

export default function News() {
  return (
    <MobileLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Studio News</h1>
        
        <div className="space-y-6">
            {/* Featured Card */}
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm group cursor-pointer">
                <div className="h-40 bg-gray-100 relative">
                    {/* Placeholder for image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-4 left-4 text-white">
                        <span className="text-[10px] font-bold bg-airborne-teal px-2 py-1 rounded mb-2 inline-block">WORKSHOP</span>
                        <h3 className="font-bold text-lg">Aerial Hoop Masterclass</h3>
                    </div>
                </div>
                <div className="p-5">
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        Join us this weekend for an intensive hoop workshop focusing on dynamic transitions and flow.
                    </p>
                    <div className="flex items-center justify-between text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1"><Calendar size={14} /> Dec 12, 2025</span>
                        <span className="flex items-center gap-1 text-airborne-teal group-hover:translate-x-1 transition-transform">Read More <ChevronRight size={14} /></span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Latest Updates</h2>
                
                <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-airborne-teal">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">Instructor Spotlight: Sarah</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">Meet our newest aerial silks expert who brings 5 years of international experience.</p>
                        <span className="text-[10px] text-gray-400">2 days ago</span>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex gap-4 cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-airborne-teal">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">New Schedule Released</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">Check out the new morning batches for Functional Training starting next week.</p>
                        <span className="text-[10px] text-gray-400">5 days ago</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </MobileLayout>
  );
}
