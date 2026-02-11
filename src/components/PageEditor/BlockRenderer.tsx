'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  Heading,
  FileText,
  List,
  Table,
  Image as ImageIcon,
  BarChart3,
  Quote,
  Code,
  Minus,
  MousePointer,
  ChevronDown,
  Columns,
  Square,
  AlertCircle,
  Video,
  FileCode,
  Megaphone,
  GraduationCap
} from 'lucide-react';

interface Block {
  id: string;
  block_type: string;
  content: any;
  settings?: any;
  display_order: number;
}

interface BlockRendererProps {
  block: Block;
  isEditing?: boolean;
  onEdit?: (blockId: string) => void;
  onDelete?: (blockId: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({ 
  block, 
  isEditing = false,
  onEdit,
  onDelete 
}) => {
  const renderBlockContent = () => {
    const { block_type, content, settings } = block;

    switch (block_type) {
      case 'heading':
        return <HeadingBlock content={content} settings={settings} />;
      case 'paragraph':
        return <ParagraphBlock content={content} settings={settings} />;
      case 'list':
        return <ListBlock content={content} settings={settings} />;
      case 'table':
        return <TableBlock content={content} settings={settings} />;
      case 'image':
        return <ImageBlock content={content} settings={settings} />;
      case 'chart':
        return <ChartBlock content={content} settings={settings} />;
      case 'quote':
        return <QuoteBlock content={content} settings={settings} />;
      case 'code':
        return <CodeBlock content={content} settings={settings} />;
      case 'divider':
        return <DividerBlock settings={settings} />;
      case 'button':
        return <ButtonBlock content={content} settings={settings} />;
      case 'accordion':
        return <AccordionBlock content={content} settings={settings} />;
      case 'tabs':
        return <TabsBlock content={content} settings={settings} />;
      case 'card':
        return <CardBlock content={content} settings={settings} />;
      case 'alert':
        return <AlertBlock content={content} settings={settings} />;
      case 'video':
        return <VideoBlock content={content} settings={settings} />;
      case 'embed':
        return <EmbedBlock content={content} settings={settings} />;
      case 'html':
        return <HtmlBlock content={content} settings={settings} />;
      case 'columns':
        return <ColumnsBlock content={content} settings={settings} />;
      case 'spacer':
        return <SpacerBlock settings={settings} />;
      case 'adBanner':
        return <AdBannerBlock content={content} settings={settings} />;
      case 'examCards':
        return <ExamCardsBlock content={content} settings={settings} />;
      default:
        return <div className="p-4 bg-gray-100 rounded">Unknown block type: {block_type}</div>;
    }
  };

  return (
    <div className={`block-wrapper ${isEditing ? 'editing' : ''}`}>
      {renderBlockContent()}
    </div>
  );
};

const HeadingBlock: React.FC<{ content: any; settings?: any }> = ({ content }) => {
  const { text = '', level = 2, alignment = 'left', color } = content;
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const baseClasses = [
    level === 1 ? 'text-4xl font-bold' : '',
    level === 2 ? 'text-3xl font-bold' : '',
    level === 3 ? 'text-2xl font-semibold' : '',
    level === 4 ? 'text-xl font-semibold' : '',
    level === 5 ? 'text-lg font-medium' : '',
    level === 6 ? 'text-base font-medium' : '',
    'mb-4'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      className={baseClasses}
      style={{ color: color || undefined, textAlign: alignment as any }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

const ParagraphBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { text, alignment = 'left', fontSize = '16px' } = content;
  
  return (
    <p 
      className={`text-${alignment} mb-4 text-gray-700 leading-relaxed`}
      style={{ fontSize }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
};

const ListBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { type = 'unordered', items = [] } = content;
  const ListTag = type === 'ordered' ? 'ol' : 'ul';
  
  return (
    <ListTag className={`mb-4 ml-6 ${type === 'ordered' ? 'list-decimal' : 'list-disc'} space-y-2`}>
      {items.map((item: string, index: number) => (
        <li key={index} className="text-gray-700" dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ListTag>
  );
};

const TableBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { headers = [], rows = [], hasHeader = true, striped = false } = content;
  
  return (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full border-collapse border border-gray-300">
        {hasHeader && headers.length > 0 && (
          <thead className="bg-blue-600 text-white">
            <tr>
              {headers.map((header: string, index: number) => (
                <th key={index} className="border border-gray-300 px-4 py-3 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row: string[], rowIndex: number) => (
            <tr key={rowIndex} className={striped && rowIndex % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
              {row.map((cell: string, cellIndex: number) => (
                <td key={cellIndex} className="border border-gray-300 px-4 py-3 text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ImageBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { url, alt = '', caption, width = '100%', alignment = 'center' } = content;
  const safeUrl = typeof url === 'string' ? url.trim() : '';

  if (!safeUrl) {
    return null;
  }
  
  return (
    <figure className={`mb-6 text-${alignment}`}>
      <img 
        src={safeUrl} 
        alt={alt} 
        className="rounded-lg shadow-md mx-auto"
        style={{ width, maxWidth: '100%' }}
      />
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-600 italic">{caption}</figcaption>
      )}
    </figure>
  );
};

const ChartBlock: React.FC<{ content: any; settings?: any }> = ({ content }) => {
  const { chartType = 'bar', data = {}, options } = content || {};
  const labels: string[] = data.labels || data.xAxis || [];
  const datasets = Array.isArray(data.datasets) && data.datasets.length > 0
    ? data.datasets
    : [{ label: data.datasetLabel || 'Value', values: data.values || data.yAxis || [] }];

  const datasetKeys = datasets.map((dataset, index) => dataset.key || dataset.label || `Series ${index + 1}`);
  const chartData = labels.map((label: string, labelIndex: number) => {
    const row: Record<string, any> = { label };
    datasets.forEach((dataset, datasetIndex) => {
      const key = datasetKeys[datasetIndex];
      const values = dataset.values || [];
      row[key] = Number(values[labelIndex] ?? 0);
    });
    return row;
  });

  const palette = ['#2563eb', '#9333ea', '#f97316', '#10b981', '#f43f5e', '#0ea5e9'];

  if (!chartData.length || !datasetKeys.length) {
    return (
      <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
        Unable to render chart — please provide labels and values.
      </div>
    );
  }

  const commonChildren = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
      <XAxis dataKey="label" stroke="#475569" />
      <YAxis stroke="#475569" />
      <Tooltip wrapperClassName="text-sm" />
      <Legend />
    </>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        {commonChildren}
        {datasetKeys.map((key, index) => (
          <Bar key={key} dataKey={key} fill={palette[index % palette.length]} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        {commonChildren}
        {datasetKeys.map((key, index) => (
          <Line key={key} type="monotone" dataKey={key} stroke={palette[index % palette.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => {
    const pieData = labels.length
      ? labels.map((label, index) => ({ name: label, value: Number(datasets[0]?.values?.[index] ?? 0) }))
      : chartData.map((row) => ({ name: row.label, value: Number(row[datasetKeys[0]]) }));

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Legend />
          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={3}>
            {pieData.map((entry, index) => (
              <Cell key={`cell-${entry.name}`} fill={palette[index % palette.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  };

  let chartBody: React.ReactNode = renderBarChart();
  if (chartType === 'line') chartBody = renderLineChart();
  if (chartType === 'pie') chartBody = renderPieChart();

  return (
    <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="h-[320px]">
        {chartBody}
      </div>
      {options?.footnote && (
        <p className="mt-3 text-xs text-slate-500">{options.footnote}</p>
      )}
    </div>
  );
};

const QuoteBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { text, author } = content;
  
  return (
    <blockquote className="mb-6 pl-6 border-l-4 border-blue-600 italic text-gray-700">
      <p className="text-lg mb-2">{text}</p>
      {author && <cite className="text-sm text-gray-600 not-italic">— {author}</cite>}
    </blockquote>
  );
};

const CodeBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { code, language = 'javascript' } = content;
  
  return (
    <pre className="mb-6 p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
};

const DividerBlock: React.FC<{ settings?: any }> = ({ settings }) => {
  return <hr className="my-8 border-t-2 border-gray-300" />;
};

const ButtonBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { text, url, variant = 'primary', size = 'medium' } = content;
  
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };
  
  return (
    <div className="mb-6">
      <a
        href={url}
        className={`inline-block rounded-lg font-semibold transition-colors ${sizeClasses[size as keyof typeof sizeClasses]} ${variantClasses[variant as keyof typeof variantClasses]}`}
      >
        {text}
      </a>
    </div>
  );
};

const AccordionBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { items = [] } = content;
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  
  return (
    <div className="mb-6 space-y-2">
      {items.map((item: any, index: number) => (
        <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center text-left font-semibold"
          >
            <span>{item.title}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${openIndex === index ? 'rotate-180' : ''}`} />
          </button>
          {openIndex === index && (
            <div className="px-4 py-3 bg-white" dangerouslySetInnerHTML={{ __html: item.content }} />
          )}
        </div>
      ))}
    </div>
  );
};

const TabsBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { tabs = [] } = content;
  const [activeTab, setActiveTab] = React.useState(0);
  
  return (
    <div className="mb-6">
      <div className="flex border-b border-gray-300">
        {tabs.map((tab: any, index: number) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === index
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="p-4 bg-white">
        {tabs[activeTab] && (
          <div dangerouslySetInnerHTML={{ __html: tabs[activeTab].content }} />
        )}
      </div>
    </div>
  );
};

const CardBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { title, description, image, link } = content;
  
  return (
    <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      {image && (
        <img src={image} alt={title} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        {title && <h3 className="text-xl font-semibold mb-2">{title}</h3>}
        {description && <p className="text-gray-700 mb-4">{description}</p>}
        {link && (
          <a href={link.url} className="text-blue-600 hover:underline font-semibold">
            {link.text || 'Learn More'} →
          </a>
        )}
      </div>
    </div>
  );
};

const AlertBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { text, type = 'info' } = content;
  
  const typeClasses = {
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    success: 'bg-green-50 border-green-500 text-green-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    error: 'bg-red-50 border-red-500 text-red-900'
  };
  
  return (
    <div className={`mb-6 p-4 border-l-4 rounded ${typeClasses[type as keyof typeof typeClasses]}`}>
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
        <div dangerouslySetInnerHTML={{ __html: text }} />
      </div>
    </div>
  );
};

const VideoBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { url, caption } = content;
  
  return (
    <div className="mb-6">
      <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-md">
        <iframe
          src={url}
          className="absolute top-0 left-0 w-full h-full"
          allowFullScreen
          title="Video content"
        />
      </div>
      {caption && <p className="mt-2 text-sm text-gray-600 text-center">{caption}</p>}
    </div>
  );
};

const EmbedBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { embedCode } = content;
  
  return (
    <div className="mb-6" dangerouslySetInnerHTML={{ __html: embedCode }} />
  );
};

const HtmlBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { html } = content;
  
  return (
    <div className="mb-6" dangerouslySetInnerHTML={{ __html: html }} />
  );
};

const ColumnsBlock: React.FC<{ content: any; settings?: any }> = ({ content, settings }) => {
  const { columns = [] } = content;
  
  return (
    <div className={`mb-6 grid grid-cols-${columns.length} gap-6`}>
      {columns.map((column: any, index: number) => (
        <div key={index} dangerouslySetInnerHTML={{ __html: column.content }} />
      ))}
    </div>
  );
};

const SpacerBlock: React.FC<{ settings?: any }> = ({ settings }) => {
  const height = settings?.height || '40px';
  
  return <div style={{ height }} />;
};

const AdBannerBlock: React.FC<{ content: any; settings?: any }> = ({ content }) => {
  const {
    imageUrl,
    linkUrl,
    headline,
    description,
    ctaLabel = 'Learn More',
    ctaUrl,
    backgroundColor = '#0f172a',
    badgeText
  } = content || {};

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md border border-slate-900/10 bg-slate-900 text-white"
      style={{ backgroundColor }}
    >
      {badgeText && (
        <div className="px-4 pt-4">
          <span className="inline-flex items-center text-xs font-semibold tracking-wide uppercase px-2 py-1 rounded-full bg-white/20">
            {badgeText}
          </span>
        </div>
      )}
      {imageUrl && (
        <div className="p-4">
          <div className="rounded-xl overflow-hidden bg-white/10 border border-white/10">
            <img src={imageUrl} alt={headline || 'Ad banner'} className="w-full object-cover" />
          </div>
        </div>
      )}
      <div className="p-4 space-y-3">
        {headline && <h3 className="text-xl font-bold leading-tight">{headline}</h3>}
        {description && <p className="text-sm text-white/80">{description}</p>}
        {(ctaUrl || linkUrl) && (
          <a
            href={ctaUrl || linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/90 text-slate-900 font-semibold hover:bg-white"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </div>
  );
};

const ExamCardsBlock: React.FC<{ content: any; settings?: any }> = ({ content }) => {
  const { examIds = [], title, layout = 'grid', columns = 2 } = content || {};

  return (
    <div className="mb-6" data-block-type="examCards" data-exam-ids={JSON.stringify(examIds)} data-layout={layout} data-columns={columns}>
      {title && <h3 className="text-xl font-bold mb-4">{title}</h3>}
      {examIds.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center text-gray-500">
          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No exams attached yet. Add exam IDs in the editor.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-1 md:grid-cols-3' : columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
          {examIds.map((id: string) => (
            <div key={id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">Exam: {id}</p>
                  <p className="text-xs text-gray-400">Loading...</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const getBlockIcon = (blockType: string) => {
  const icons: Record<string, any> = {
    heading: Heading,
    paragraph: FileText,
    list: List,
    table: Table,
    image: ImageIcon,
    chart: BarChart3,
    quote: Quote,
    code: Code,
    divider: Minus,
    button: MousePointer,
    accordion: ChevronDown,
    tabs: Columns,
    card: Square,
    alert: AlertCircle,
    video: Video,
    embed: FileCode,
    html: FileCode,
    columns: Columns,
    spacer: Minus,
    adBanner: Megaphone,
    examCards: GraduationCap
  };
  
  return icons[blockType] || FileText;
};
