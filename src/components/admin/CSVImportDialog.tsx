import { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle2, XCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseCSV, generateCSVTemplate, CSVParseResult, ParsedSection, ParsedQuestion, ParsedOption } from '@/lib/utils/csvParser';

interface CSVImportDialogProps {
  onImport: (sections: ParsedSection[]) => void;
  onClose: () => void;
}

export function CSVImportDialog({ onImport, onClose }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setShowPreview(false);
    setParseResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const result = parseCSV(csvText);
      setParseResult(result);
      setShowPreview(true);
    };
    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (parseResult && parseResult.isValid) {
      onImport(parseResult.sections);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Import Exam from CSV</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV file to bulk import questions and sections
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!showPreview ? (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select a CSV file containing exam questions and sections
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <FileText className="h-4 w-4 mr-2" />
                      Choose File
                    </span>
                  </Button>
                </label>
              </div>

              <div className="bg-muted/50 rounded-xl p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Need a template?
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Download our CSV template with example data to get started quickly.
                </p>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">CSV Format Requirements</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• <strong>Required columns:</strong> section_name, question_type, question_text, marks</li>
                  <li>• <strong>Question types:</strong> single, multiple, truefalse, numerical (aliases like MCQ, multi-select, true/false accepted)</li>
                  <li>• <strong>Difficulty levels:</strong> easy, medium, hard</li>
                  <li>• <strong>Image flags:</strong> Set requires_image=true for questions/options needing images</li>
                  <li>• <strong>Options:</strong> Use option_1_text, option_1_correct, option_1_requires_image, etc.</li>
                </ul>
              </div>
            </div>
          ) : parseResult ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Import Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Review the parsed data before importing
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setShowPreview(false);
                  setFile(null);
                  setParseResult(null);
                }}>
                  Upload Different File
                </Button>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        {parseResult.errors.length} Error{parseResult.errors.length > 1 ? 's' : ''} Found
                      </h4>
                      <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                        {parseResult.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>
                            Row {error.row}: {error.field} - {error.message}
                          </li>
                        ))}
                        {parseResult.errors.length > 5 && (
                          <li className="font-semibold">
                            ... and {parseResult.errors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {parseResult.warnings.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                        {parseResult.warnings.length} Warning{parseResult.warnings.length > 1 ? 's' : ''}
                      </h4>
                      <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                        {parseResult.warnings.slice(0, 3).map((warning, idx) => (
                          <li key={idx}>
                            Row {warning.row}: {warning.field} - {warning.message}
                          </li>
                        ))}
                        {parseResult.warnings.length > 3 && (
                          <li className="font-semibold">
                            ... and {parseResult.warnings.length - 3} more warnings
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {parseResult.isValid && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        CSV Validation Successful
                      </h4>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Found {parseResult.sections.length} section{parseResult.sections.length > 1 ? 's' : ''} with{' '}
                        {parseResult.sections.reduce((sum, s) => sum + s.questions.length, 0)} question{parseResult.sections.reduce((sum, s) => sum + s.questions.length, 0) > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {parseResult.sections.map((section, sIdx) => (
                  <div
                    key={sIdx}
                    className={`border rounded-xl p-4 ${
                      section.hasError
                        ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {section.name}
                          {section.hasError && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              Has Errors
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {section.questions.length} question{section.questions.length > 1 ? 's' : ''} • 
                          {section.duration > 0 ? ` ${Math.floor(section.duration / 60)} min` : ' No duration'} • 
                          {section.marks_per_question} mark{section.marks_per_question > 1 ? 's' : ''} per question
                        </p>
                        {section.errorMessages && section.errorMessages.length > 0 && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {section.errorMessages.map((msg, i) => (
                              <div key={i}>• {msg}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mt-4">
                      {section.questions.map((question, qIdx) => (
                        <div
                          key={qIdx}
                          className={`border rounded-lg p-3 text-sm ${
                            question.hasError
                              ? 'border-red-300 bg-red-50 dark:bg-red-950/20'
                              : 'border-border bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <span className="font-semibold text-muted-foreground">Q{qIdx + 1}.</span>
                            <div className="flex-1">
                              <p className={question.text ? '' : 'text-red-600 dark:text-red-400'}>
                                {question.text || '[Missing question text]'}
                              </p>
                              {question.requires_image && (
                                <div className="mt-2 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                  <ImageIcon className="h-4 w-4" />
                                  <span className="text-xs font-semibold">Image upload required</span>
                                </div>
                              )}
                              {question.errorMessages && question.errorMessages.length > 0 && (
                                <div className="mt-2 text-red-600 dark:text-red-400">
                                  {question.errorMessages.map((msg, i) => (
                                    <div key={i} className="text-xs">• {msg}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                {question.type}
                              </span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {question.marks} mark{question.marks > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          {question.options.length > 0 && (
                            <div className="ml-6 space-y-1">
                              {question.options.map((option, oIdx) => (
                                <div
                                  key={oIdx}
                                  className={`flex items-center gap-2 text-xs ${
                                    option.is_correct
                                      ? 'text-green-700 dark:text-green-400 font-semibold'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  <span>{String.fromCharCode(65 + oIdx)}.</span>
                                  <span className="flex-1">
                                    {option.option_text || (
                                      <span className="text-red-600 dark:text-red-400">[Missing option text]</span>
                                    )}
                                  </span>
                                  {option.is_correct && (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  {option.requires_image && (
                                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                      <ImageIcon className="h-3 w-3" />
                                      <span className="text-xs">Image required</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {showPreview && parseResult && (
          <div className="p-6 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {parseResult.isValid ? (
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    Ready to import
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-semibold">
                    Fix errors before importing
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!parseResult.isValid}
                  className="bg-primary text-primary-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {parseResult.sections.length} Section{parseResult.sections.length > 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
