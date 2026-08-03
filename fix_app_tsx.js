const fs = require('fs');
const filePath = 'artifacts/study-tracker/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("import { useEffect } from 'react';", "import { useEffect, Suspense, lazy } from 'react';");

content = content.replace("import NotFound from '@/pages/not-found';", "const NotFound = lazy(() => import('@/pages/not-found'));");
content = content.replace("import Home from '@/pages/Home';", "const Home = lazy(() => import('@/pages/Home'));");
content = content.replace("import SubjectDetail from '@/pages/SubjectDetail';", "const SubjectDetail = lazy(() => import('@/pages/SubjectDetail'));");
content = content.replace("import Timeline from '@/pages/Timeline';", "const Timeline = lazy(() => import('@/pages/Timeline'));");
content = content.replace("import Analytics from '@/pages/Analytics';", "const Analytics = lazy(() => import('@/pages/Analytics'));");
content = content.replace("import Settings from '@/pages/Settings';", "const Settings = lazy(() => import('@/pages/Settings'));");

content = content.replace(
  /<Switch>[\s\S]+?<\/Switch>/,
  `<Suspense fallback={
              <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            }>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/subjects/:id" component={SubjectDetail} />
                <Route path="/timeline" component={Timeline} />
                <Route path="/analytics" component={Analytics} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </Suspense>`
);

fs.writeFileSync(filePath, content);
