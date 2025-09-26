import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/header";
import { EnhancedWeatherWidget } from "@/components/enhanced-weather-widget";
import { CountdownWidget } from "@/components/countdown-widget";
import { TodaysTasksWidget } from "@/components/todays-tasks-widget";
import { Calendar, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Task, QuestionLog, ExamResult } from "@shared/schema";
import { Button } from "@/components/ui/button";

// Centered Welcome Section Component with Clock
function CenteredWelcomeSection() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date and time for Sakarya Serdivan (Turkey timezone)
  const formatDateTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };

    const dateStr = currentTime.toLocaleDateString('tr-TR', options);
    const timeStr = currentTime.toLocaleTimeString('tr-TR', timeOptions);
    
    return { dateStr, timeStr };
  };

  const { dateStr, timeStr } = formatDateTime();

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="space-y-2">
        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent">
          Hoşgeldiniz Berat Çakıroğlu
        </h1>
      </div>
      
      {/* Centered Clock and Time Display */}
      <div className="flex flex-col items-center space-y-6">
        {/* Time and Clock Container - Centered with Clock Icon Above */}
        <div className="flex items-center justify-center space-x-6">
          {/* Enhanced Clock Icon with Glassmorphism - Centered and Moved Up */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-violet-600/30 to-black/40 rounded-3xl blur-2xl animate-pulse"></div>
            <div className="relative w-20 h-20 bg-black/10 dark:bg-purple-950/20 backdrop-blur-xl border border-purple-500/20 dark:border-purple-400/20 rounded-3xl flex items-center justify-center shadow-2xl transform -translate-y-2">
              <Clock className="h-10 w-10 text-purple-600 dark:text-purple-400 drop-shadow-lg" />
            </div>
          </div>
          
          {/* Enhanced Time Display with Purple-Black Gradient */}
          <div className="text-8xl font-black bg-gradient-to-r from-purple-600 via-violet-700 to-black dark:from-purple-400 dark:via-violet-500 dark:to-gray-300 bg-clip-text text-transparent font-mono tracking-tighter drop-shadow-lg" data-testid="text-time-center">
            {timeStr}
          </div>
        </div>
        
        {/* Stylized Date and Location - Left Aligned and Centered */}
        <div className="flex items-center justify-center space-x-4 text-2xl font-semibold">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 shadow-lg animate-pulse"></div>
            <span className="bg-gradient-to-r from-purple-800 to-black dark:from-purple-300 dark:to-gray-200 bg-clip-text text-transparent font-bold" data-testid="text-date-center">
              {dateStr}
            </span>
          </div>
          <span className="text-muted-foreground/50">•</span>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <span className="text-lg">📍</span>
            <span className="font-bold bg-gradient-to-r from-purple-600 to-violet-700 dark:from-purple-400 dark:to-violet-500 bg-clip-text text-transparent">
              Sakarya, Serdivan
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Homepage() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  
  // State for calendar navigation (separate from current date)
  const currentDate = new Date();
  const [displayYear, setDisplayYear] = useState(currentDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(currentDate.getMonth());

  const { data: calendarData } = useQuery<{
    date: string;
    dayNumber: number;
    daysRemaining: number;
    tasks: Task[];
    tasksCount: number;
  }>({
    queryKey: ["/api/calendar", selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;
      const response = await fetch(`/api/calendar/${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      return response.json();
    },
    enabled: !!selectedDate,
  });

  // Fetch all tasks, question logs, and exam results to check for activities
  const { data: allTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  
  const { data: questionLogs = [] } = useQuery<QuestionLog[]>({
    queryKey: ["/api/question-logs"],
  });
  
  const { data: examResults = [] } = useQuery<ExamResult[]>({
    queryKey: ["/api/exam-results"],
  });

  // Memoized calendar generation to prevent flickering
  const calendarDays = useMemo(() => {
    const year = displayYear;
    const month = displayMonth;
    const firstDay = new Date(year, month, 1);
    
    // Start from Monday (fix week alignment)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - startOffset);
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  }, [displayYear, displayMonth]);

  // Current date constants for comparison
  const today = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Optimized navigation functions using useCallback
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setDisplayMonth(prev => prev === 0 ? 11 : prev - 1);
      setDisplayYear(prev => displayMonth === 0 ? prev - 1 : prev);
    } else {
      setDisplayMonth(prev => prev === 11 ? 0 : prev + 1);
      setDisplayYear(prev => displayMonth === 11 ? prev + 1 : prev);
    }
  }, [displayMonth]);

  // Memoized activity checking to prevent recalculation
  const hasActivities = useCallback((date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    // Check completed tasks
    const hasCompletedTasks = allTasks.some(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      return completedDate === dateStr;
    });
    
    // Check question logs
    const hasQuestionLogs = questionLogs.some(log => log.study_date === dateStr);
    
    // Check exam results
    const hasExamResults = examResults.some(exam => exam.exam_date === dateStr);
    
    return hasCompletedTasks || hasQuestionLogs || hasExamResults;
  }, [allTasks, questionLogs, examResults]);

  // Get activities for a specific date
  const getActivitiesForDate = useCallback((date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    
    const completedTasks = allTasks.filter(task => {
      if (!task.completedAt) return false;
      const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
      return completedDate === dateStr;
    });
    
    const dayQuestionLogs = questionLogs.filter(log => log.study_date === dateStr);
    const dayExamResults = examResults.filter(exam => exam.exam_date === dateStr);
    
    return {
      tasks: completedTasks,
      questionLogs: dayQuestionLogs,
      examResults: dayExamResults,
      total: completedTasks.length + dayQuestionLogs.length + dayExamResults.length
    };
  }, [allTasks, questionLogs, examResults]);

  const handleDateClick = (date: Date) => {
    // Fix: Use the actual date without timezone issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setSelectedDate(dateStr);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header hideClockOnHomepage={true} />
      

      {/* Centered Welcome Section with Clock */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <CenteredWelcomeSection />
      </div>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Top Row - Calendar and Today's Tasks Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 items-stretch">
          {/* Modern Calendar Widget - Takes 3 columns (slightly bigger) */}
          <div className="lg:col-span-3 bg-gradient-to-br from-card to-card/80 rounded-2xl border border-border/50 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent flex items-center">
                <Calendar className="h-5 w-5 mr-3 text-primary" />
                Takvim
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium text-muted-foreground px-3 py-1 bg-muted/50 rounded-full min-w-[140px] text-center">
                  {new Date(displayYear, displayMonth).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8 w-8 p-0 hover:bg-primary/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modern Calendar Grid */}
            <div className="space-y-2">
              {/* Week Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day, index) => (
                  <div key={day} className="text-center text-xs font-semibold text-muted-foreground/70 py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === displayMonth;
                  const isToday = date.getDate() === today && isCurrentMonth && displayYear === currentYear && displayMonth === currentMonth;
                  const year = date.getFullYear();
                  const month_num = (date.getMonth() + 1).toString().padStart(2, '0');
                  const day = date.getDate().toString().padStart(2, '0');
                  const dateStr = `${year}-${month_num}-${day}`;
                  const isSelected = selectedDate === dateStr;
                  const dayHasActivities = hasActivities(date);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      className={`relative aspect-square flex flex-col items-center justify-center text-sm font-medium rounded-xl transition-all duration-200 transform hover:scale-105 ${
                        isToday
                          ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 scale-105"
                          : isSelected
                          ? "bg-gradient-to-br from-accent to-accent/80 text-accent-foreground ring-2 ring-primary/50 shadow-md"
                          : isCurrentMonth
                          ? "hover:bg-gradient-to-br hover:from-secondary hover:to-secondary/80 cursor-pointer text-foreground hover:shadow-md border border-transparent hover:border-border/50"
                          : "text-muted-foreground/30 cursor-pointer hover:text-muted-foreground/50"
                      }`}
                      data-testid={`calendar-day-${date.getDate()}`}
                    >
                      <span>{date.getDate()}</span>
                      {dayHasActivities && isCurrentMonth && (
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-0.5"></div>
                      )}
                      {isToday && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Enhanced Interactive Calendar Report Panel */}
            {selectedDate && (
              <div className="mt-6 space-y-4">
                {/* Main Date Info Card */}
                <div className="p-5 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-foreground flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-2 animate-pulse"></div>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric',
                        weekday: 'long'
                      })}
                    </h4>
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {calendarData?.daysRemaining && calendarData.daysRemaining > 0 
                        ? `${calendarData.daysRemaining} gün sonra` 
                        : calendarData?.daysRemaining === 0 
                        ? "Bugün" 
                        : `${Math.abs(calendarData?.daysRemaining || 0)} gün önce`}
                    </span>
                  </div>
                  
                  {(() => {
                    const selectedDateObj = new Date(selectedDate + 'T12:00:00');
                    const today = new Date();
                    const isPastDate = selectedDateObj < today;
                    const activities = getActivitiesForDate(selectedDateObj);
                    
                    if (isPastDate) {
                      // Enhanced Past Date Report
                      if (activities.total === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-muted/50 rounded-full flex items-center justify-center">
                              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Bu gün hiç aktivite yapılmamış
                            </p>
                            <p className="text-xs text-muted-foreground/70">
                              Gelecekte daha aktif olmaya çalışalım! 💪
                            </p>
                          </div>
                        );
                      } else {
                        const taskProgress = activities.tasks.length;
                        const questionProgress = activities.questionLogs.length;
                        const examProgress = activities.examResults.length;
                        
                        return (
                          <div className="space-y-4">
                            {/* Activity Summary Cards */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{taskProgress}</div>
                                <div className="text-xs text-green-700 dark:text-green-300">Görev</div>
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{questionProgress}</div>
                                <div className="text-xs text-blue-700 dark:text-blue-300">Soru</div>
                              </div>
                              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{examProgress}</div>
                                <div className="text-xs text-purple-700 dark:text-purple-300">Deneme</div>
                              </div>
                            </div>

                            {/* Total Activity Progress */}
                            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">Günlük Performans</span>
                                <span className="text-lg font-bold text-primary">{activities.total}</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${Math.min((activities.total / 10) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {activities.total >= 10 ? "Müthiş bir gün! 🎉" : activities.total >= 5 ? "İyi gidiyor! 👍" : "Daha fazla çalışabiliriz! 💪"}
                              </div>
                            </div>

                            {/* Detailed Activity List */}
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
                                Aktivite Detayları
                              </h5>
                              {/* Show completed tasks */}
                              {activities.tasks.slice(0, 3).map((task: Task) => (
                                <div key={task.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/10 rounded-lg">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    <span className="font-medium">Görev:</span>
                                    <span className="ml-2 text-muted-foreground">{task.title}</span>
                                  </div>
                                  <div className="text-xs text-green-600 bg-green-100 dark:bg-green-900/20 px-2 py-1 rounded-full">
                                    ✓ Tamamlandı
                                  </div>
                                </div>
                              ))}
                              
                              {/* Show question logs */}
                              {activities.questionLogs.slice(0, 3 - activities.tasks.length).map((log: QuestionLog) => (
                                <div key={log.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    <span className="font-medium">Soru:</span>
                                    <span className="ml-2 text-muted-foreground">{log.exam_type} {log.subject}</span>
                                  </div>
                                  <div className="text-xs text-blue-600 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                                    {log.correct_count} doğru
                                  </div>
                                </div>
                              ))}
                              
                              {/* Show exam results */}
                              {activities.examResults.slice(0, 3 - activities.tasks.length - activities.questionLogs.length).map((exam: ExamResult) => (
                                <div key={exam.id} className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-950/10 rounded-lg">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                                    <span className="font-medium">Deneme:</span>
                                    <span className="ml-2 text-muted-foreground">{exam.exam_name}</span>
                                  </div>
                                  <div className="text-xs text-purple-600 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded-full">
                                    TYT: {exam.tyt_net} | AYT: {exam.ayt_net}
                                  </div>
                                </div>
                              ))}
                              
                              {activities.total > 3 && (
                                <button className="w-full text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-4 py-3 rounded-lg transition-colors duration-200 mt-3 border border-primary/20">
                                  Tüm Aktiviteleri Görüntüle ({activities.total} toplam)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                    } else {
                      // Enhanced Future Date Planning
                      return (
                        <div className="space-y-4">
                          {/* Planning Summary */}
                          <div className="bg-gradient-to-r from-accent/5 to-accent/10 rounded-lg p-4 border border-accent/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Planlanan Aktiviteler</span>
                              <span className="text-lg font-bold text-accent">{calendarData?.tasksCount || 0}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {(calendarData?.tasksCount || 0) === 0 
                                ? "Henüz bu güne özel görev planlanmamış" 
                                : `${calendarData?.tasksCount || 0} görev bu güne planlandı`}
                            </div>
                          </div>

                          {/* Planned Tasks */}
                          {calendarData?.tasks && calendarData.tasks.length > 0 && (
                            <div className="space-y-2">
                              <h5 className="font-semibold text-sm text-foreground mb-3 flex items-center">
                                <div className="w-2 h-2 bg-accent rounded-full mr-2"></div>
                                Planlanan Görevler
                              </h5>
                              {calendarData.tasks.slice(0, 3).map((task: Task) => (
                                <div key={task.id} className="flex items-center justify-between p-3 bg-accent/5 rounded-lg border border-accent/10">
                                  <div className="flex items-center text-sm">
                                    <div className="w-2 h-2 bg-accent/60 rounded-full mr-3"></div>
                                    <span className="font-medium text-foreground">{task.title}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                                      {task.priority === 'high' ? '🔴 Yüksek' : task.priority === 'medium' ? '🟡 Orta' : '🟢 Düşük'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {task.category}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {calendarData.tasks.length > 3 && (
                                <div className="text-center">
                                  <button className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/20 px-4 py-2 rounded-lg transition-colors duration-200">
                                    {calendarData.tasks.length - 3} görev daha göster
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick Actions for Future Dates */}
                          <div className="border-t border-border/50 pt-4">
                            <div className="flex gap-2">
                              <button className="flex-1 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors duration-200">
                                + Görev Ekle
                              </button>
                              <button className="flex-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-2 rounded-lg transition-colors duration-200">
                                📅 Takvime Ekle
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })()
                  }
                </div>
              </div>
            )}
          </div>

          {/* Today's Tasks Column - Takes 2 columns */}
          <div className="lg:col-span-2 h-full">
            <TodaysTasksWidget />
          </div>
        </div>

        {/* Middle Row - Weather Widget (Full Width) */}
        <div className="mb-8">
          <EnhancedWeatherWidget />
        </div>


        {/* Countdown Section - Moved to Bottom */}
        <div className="mb-8">
          <CountdownWidget className="p-5 md:p-6" />
        </div>
      </main>
    </div>
  );
}