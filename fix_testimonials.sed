# Fix container padding
s/p-5 sm:p-8 md:p-12/p-4 sm:p-6 md:p-8 lg:p-12/
s/rounded-3xl bg-\[radial/rounded-2xl sm:rounded-3xl bg-[radial/

# Fix spacing
s/space-y-10/space-y-6 md:space-y-10/
s/gap-6 md:flex-row/gap-4 md:gap-6 md:flex-row/
s/space-y-4">$/space-y-2 md:space-y-4">/

# Fix eyebrow
s/px-4 py-1 text-xs font-semibold/px-3 py-1 text-xs font-semibold/

# Fix heading
s/text-2xl md:text-4xl/text-xl sm:text-2xl md:text-3xl lg:text-4xl/

# Fix card gaps
s/gap-4 sm:gap-6 overflow-x-auto/gap-3 sm:gap-4 md:gap-6 overflow-x-auto/
s/px-4 -mx-4 sm:px-0 sm:mx-0 pb-6/px-3 sm:px-4 -mx-3 sm:-mx-4 md:px-0 md:mx-0 pb-4 md:pb-6/

# Fix card widths
s/w-\[17rem\] sm:w-\[22rem\] max-w-\[85vw\]/w-[15rem] sm:w-[18rem] md:w-[22rem] max-w-[90vw]/

# Fix card borders
s/rounded-3xl bg-gradient-to-br from-white/rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/
s/rounded-\[calc(1.5rem-1px)\] bg-white/rounded-2xl sm:rounded-3xl bg-white/

# Fix card padding and gaps
s/p-6 space-y-4/p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4/

# Fix profile section
s/gap-3">$/gap-2 sm:gap-3">/
s/className="h-12 w-12 rounded-full object-cover"/className="h-10 sm:h-12 w-10 sm:w-12 rounded-full object-cover flex-shrink-0"/
s/className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-base/className="flex h-10 sm:h-12 w-10 sm:w-12 items-center justify-center rounded-full bg-orange-100 text-sm sm:text-base/

# Fix name display
s/<div>$/<div className="min-w-0">/
s/className="text-base font-semibold text-slate-900">{item.name}</p>/className="text-sm sm:text-base font-semibold text-slate-900 truncate">{item.name}<\/p>/
s/className="text-xs font-medium uppercase tracking-wide text-orange-500">{item.exam}</p>/className="text-xs font-medium uppercase tracking-wide text-orange-500 truncate">{item.exam}<\/p>/

# Remove featured badge  
/item.highlight && (/,+1 d
/<span className="ml-auto/,+2 d

# Fix review text
s/className="text-sm leading-relaxed/className="text-xs sm:text-sm leading-relaxed line-clamp-3"/

# Hide scroll buttons on mobile
s/opacity-0 group-hover:opacity-100 transition"/opacity-0 group-hover:opacity-100 transition hidden md:flex"/g
