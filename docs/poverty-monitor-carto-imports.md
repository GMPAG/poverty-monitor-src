# Importing data to CartoDB

I've been importing data from a spreadsheet provided by the Manchester University team. Here is a list of modifications that I have made to the spreadsheet in order to make the import work:

* Some cells in the spreadsheet contain symbols like the hash sign (#) or a double dot (..). Presumably these symbols indicate that there is no data available for the given goegraphical area. When these symbols appear in a column, CartoDB assumes that the column is of a string data type. I have replaced these symbols with a minus sign (-) which Carto then treats as zero. Zero is not ideal, ideally we would indicate NaN.

* The geocodes start with "E" but are interpreted as numbers and then all imported as zero. I edit one cell to start with something that is obviously a string and then the whole column is imorted as strings.



To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???
To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???
To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???
To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???
To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???
To do: ??? Transpose the metadata imports so that columns can be types and so that each row applies to a single dataset column ???

