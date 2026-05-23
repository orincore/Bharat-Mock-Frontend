const fs = require('fs');
const file = './src/app/test-series/[slug]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add Imports
code = code.replace(
  "import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';",
  `import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';\nimport { PageBlockRenderer } from '@/components/PageEditor/PageBlockRenderer';\n\nconst apiBase = process.env.NEXT_PUBLIC_API_URL\n  ? process.env.NEXT_PUBLIC_API_URL.replace(/\\/$/, "")\n  : "";\n\nconst buildApiUrl = (path: string) => {\n  const normalizedPath = path.startsWith("/") ? path : \`/\${path}\`;\n  if (apiBase) {\n    return \`\${apiBase}\${normalizedPath}\`;\n  }\n  return \`/api/v1\${normalizedPath}\`;\n};`
);

// 2. Add State Variables
code = code.replace(
  "const [sidebarLoading, setSidebarLoading] = useState(true);",
  `const [sidebarLoading, setSidebarLoading] = useState(true);\n  const [globalTab, setGlobalTab] = useState<string>('overview');\n  const [pageContent, setPageContent] = useState<any>({ sections: [], orphanBlocks: [] });\n  const [customTabs, setCustomTabs] = useState<any[]>([]);\n  const tabScrollRef = useRef<HTMLDivElement>(null);`
);

// 3. Add fetching logic
code = code.replace(
  "const data = await testSeriesService.getTestSeriesBySlug(slug);\n      setTestSeries(data);",
  `const data = await testSeriesService.getTestSeriesBySlug(slug);\n      setTestSeries(data);\n      if (data?.id) {\n        const contentRes = await fetch(buildApiUrl(\`/test-series-page-content/\${data.id}\`));\n        if (contentRes.ok) {\n           const contentData = await contentRes.json();\n           setPageContent(contentData);\n           setCustomTabs(Array.isArray(contentData.customTabs) ? contentData.customTabs : []);\n        }\n      }`
);

// 4. Add getSectionsForTab
code = code.replace(
  "const { grouped, uncategorized } = groupedData;",
  `const { grouped, uncategorized } = groupedData;\n\n  const getSectionsForTab = (tabId: string) => {\n     if (!pageContent?.sections) return [];\n     if (tabId === 'overview') {\n        return pageContent.sections.filter((s: any) => !s.custom_tab_id && !s.category_custom_tab_id && !s.testSeries_custom_tab_id);\n     }\n     return pageContent.sections.filter((s: any) => s.custom_tab_id === tabId || s.category_custom_tab_id === tabId || s.testSeries_custom_tab_id === tabId);\n  };`
);

// 5. Add Tab Bar UI after Hero Section
const heroEndString = "</div>\n      </div>\n\n      {/* Test Series Content */}\n      <div className=\"container-main py-6 overflow-hidden\">";
const tabBarUI = `</div>\n      </div>\n\n      {/* Global Tab Bar */}\n      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">\n        <div className="container-main">\n          <div className="flex items-center py-4 gap-2">\n            <button\n              onClick={() => tabScrollRef.current?.scrollBy({ left: -160, behavior: "smooth" })}\n              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-400 shadow-sm"\n            >\n              <ChevronLeft className="w-4 h-4" />\n            </button>\n            <div ref={tabScrollRef} className="flex-1 overflow-x-auto hide-scrollbar">\n              <div className="flex items-center space-x-6">\n                <button\n                  onClick={() => setGlobalTab('overview')}\n                  className={\`whitespace-nowrap text-sm font-medium transition-colors \${\n                    globalTab === 'overview'\n                      ? "text-blue-600 border-b-2 border-blue-600 pb-1"\n                      : "text-slate-700 hover:text-blue-600"\n                  }\`}\n                >\n                  Overview\n                </button>\n                {customTabs.map(tab => (\n                  <button\n                    key={tab.id}\n                    onClick={() => setGlobalTab(tab.id)}\n                    className={\`whitespace-nowrap text-sm font-medium transition-colors \${\n                      globalTab === tab.id\n                        ? "text-blue-600 border-b-2 border-blue-600 pb-1"\n                        : "text-slate-700 hover:text-blue-600"\n                    }\`}\n                  >\n                    {tab.title}\n                  </button>\n                ))}\n              </div>\n            </div>\n            <button\n              onClick={() => tabScrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })}\n              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-400 shadow-sm"\n            >\n              <ChevronRight className="w-4 h-4" />\n            </button>\n          </div>\n        </div>\n      </div>\n\n      {/* Test Series Content */}\n      <div className="container-main py-6 overflow-hidden">`;
code = code.replace(heroEndString, tabBarUI);

// 6. Wrap the Mock Test container with conditional
code = code.replace(
  "<div className=\"grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start\">\n          <div className=\"space-y-5 min-w-0 w-full overflow-hidden\">",
  "<div className=\"grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start\">\n          <div className=\"space-y-5 min-w-0 w-full overflow-hidden\">\n            {globalTab === 'overview' ? (\n              <>\n"
);

// Find the end of the main column (before the <aside>)
const asideString = "          </div>\n\n          <aside className=\"space-y-5\">";
const wrappedMainColumn = `              </>\n            ) : (\n              <div className="space-y-8">\n                 {getSectionsForTab(globalTab).length > 0 ? (\n                     getSectionsForTab(globalTab).map(section => (\n                         <div key={section.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">\n                             <h2 className="text-2xl font-bold text-slate-900 mb-6">{section.title}</h2>\n                             <div className="space-y-5">\n                               {section.blocks?.map((block: any) => (\n                                   <PageBlockRenderer key={block.id} block={block} />\n                               ))}\n                             </div>\n                         </div>\n                     ))\n                 ) : (\n                     <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">\n                        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />\n                        <p className="text-muted-foreground text-center">No content available for this tab.</p>\n                     </div>\n                 )}\n              </div>\n            )}\n\n            {globalTab === 'overview' && getSectionsForTab('overview').length > 0 && (\n              <div className="space-y-8 mt-8">\n                 {getSectionsForTab('overview').map(section => (\n                     <section key={section.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">\n                         <h2 className="text-2xl font-bold text-slate-900 mb-6">{section.title}</h2>\n                         <div className="space-y-5">\n                             {section.blocks?.map((block: any) => (\n                                 <PageBlockRenderer key={block.id} block={block} />\n                             ))}\n                         </div>\n                     </section>\n                 ))}\n              </div>\n            )}\n          </div>\n\n          <aside className="space-y-5">`;
code = code.replace(asideString, wrappedMainColumn);

// 7. Remove the hardcoded sections
// Note: We need to use regex to remove everything from `<section className="mt-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">` up to the end of the `container-main` div.
// Wait, the hardcoded sections are inside the `.container-main py-6 overflow-hidden` directly at the bottom, after the grid!
// Let's check how it ends.
const hardcodedStart = "<section className=\"mt-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5\">";
const hardcodedRegex = /<section className="mt-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">[\s\S]*?<\/Accordion>\n        <\/section>/g;
code = code.replace(hardcodedRegex, "");

fs.writeFileSync(file, code);
console.log("Patched successfully!");
