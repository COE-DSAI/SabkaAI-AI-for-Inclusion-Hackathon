import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, BookOpen, Award, Clock, 
  TrendingUp, Wallet, Shield, Wheat,
  ChevronRight, Star, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Course {
  id: number;
  title: string;
  description: string;
  duration: string;
  lessons: number;
  completedLessons: number;
  icon: React.ElementType;
  category: string;
  difficulty: 'शुरुआती' | 'मध्यम' | 'उन्नत';
}

const courses: Course[] = [
  {
    id: 1,
    title: 'बचत कैसे करें',
    description: 'हर महीने पैसे बचाने के आसान तरीके',
    duration: '15 मिनट',
    lessons: 5,
    completedLessons: 3,
    icon: Wallet,
    category: 'बचत',
    difficulty: 'शुरुआती',
  },
  {
    id: 2,
    title: 'फसल बीमा समझें',
    description: 'अपनी फसल को कैसे सुरक्षित करें',
    duration: '20 मिनट',
    lessons: 4,
    completedLessons: 0,
    icon: Shield,
    category: 'बीमा',
    difficulty: 'शुरुआती',
  },
  {
    id: 3,
    title: 'बैंक खाता का उपयोग',
    description: 'ATM, UPI और मोबाइल बैंकिंग सीखें',
    duration: '25 मिनट',
    lessons: 6,
    completedLessons: 6,
    icon: TrendingUp,
    category: 'बैंकिंग',
    difficulty: 'शुरुआती',
  },
  {
    id: 4,
    title: 'खेती में निवेश',
    description: 'खाद, बीज और उपकरण में सही निवेश',
    duration: '30 मिनट',
    lessons: 8,
    completedLessons: 2,
    icon: Wheat,
    category: 'खेती',
    difficulty: 'मध्यम',
  },
];

const Seekho = () => {
  const completedCourses = courses.filter(c => c.completedLessons === c.lessons).length;
  const totalProgress = Math.round(
    (courses.reduce((sum, c) => sum + c.completedLessons, 0) / 
    courses.reduce((sum, c) => sum + c.lessons, 0)) * 100
  );

  return (
    <AppLayout>
      <div className="container px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">आर्थिक शिक्षा</h1>
          <p className="text-sm text-muted-foreground">पैसों की समझ, आसान भाषा में</p>
        </div>

        {/* Progress Card */}
        <Card className="border-none shadow-md bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <Award className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">आपकी प्रगति</p>
                  <p className="text-sm text-muted-foreground">{completedCourses} कोर्स पूरे</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{totalProgress}%</p>
              </div>
            </div>
            <Progress value={totalProgress} className="h-2" />
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-accent-foreground" />
              <p className="text-sm text-muted-foreground">
                अगला बैज: <span className="font-medium text-foreground">बचत गुरु</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Continue Learning */}
        {courses.filter(c => c.completedLessons > 0 && c.completedLessons < c.lessons).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              जारी रखें
            </h2>
            {courses
              .filter(c => c.completedLessons > 0 && c.completedLessons < c.lessons)
              .map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
          </div>
        )}

        {/* All Courses */}
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            सभी कोर्स
          </h2>
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

const CourseCard = ({ course }: { course: Course }) => {
  const progress = Math.round((course.completedLessons / course.lessons) * 100);
  const isCompleted = course.completedLessons === course.lessons;

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            isCompleted ? "bg-accent/50" : "bg-primary/10"
          )}>
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6 text-accent-foreground" />
            ) : (
              <course.icon className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-foreground">{course.title}</h3>
                <p className="text-sm text-muted-foreground">{course.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {course.duration}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {course.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {course.completedLessons}/{course.lessons} पाठ
              </span>
            </div>
            {progress > 0 && !isCompleted && (
              <Progress value={progress} className="h-1.5" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Seekho;
