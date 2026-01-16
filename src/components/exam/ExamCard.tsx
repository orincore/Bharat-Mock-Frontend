import { Exam } from '@/types';
import { Link } from 'react-router-dom';
import { Clock, FileText, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ExamCardProps {
  exam: Exam;
}

export function ExamCard({ exam }: ExamCardProps) {
  const statusColors = {
    upcoming: 'bg-warning/10 text-warning border-warning/30',
    ongoing: 'bg-success/10 text-success border-success/30',
    completed: 'bg-muted text-muted-foreground border-muted',
  };

  const difficultyColors = {
    easy: 'bg-success/10 text-success',
    medium: 'bg-warning/10 text-warning',
    hard: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="card-interactive group overflow-hidden">
      {/* Image */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={exam.image}
          alt={exam.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className={statusColors[exam.status]}>
            {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
          </Badge>
          <Badge className={difficultyColors[exam.difficulty]}>
            {exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}
          </Badge>
        </div>
        
        <div className="absolute bottom-3 left-3">
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-background/90 text-foreground">
            {exam.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-display font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {exam.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {exam.description}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{exam.duration} mins</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            <span>{exam.totalQuestions} Qs</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>{exam.totalMarks} Marks</span>
          </div>
          {exam.attempts && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>{exam.attempts.toLocaleString()}</span>
            </div>
          )}
        </div>

        <Link to={`/exams/${exam.id}`}>
          <Button className="w-full group/btn">
            View Details
            <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
