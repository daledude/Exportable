/*! Exportable 0.0.7
 * © 2017 Karl Saunders
 */
/**
 * @summary     Exportable
 * @description Vanilla-DataTables extension to allow for exporting to various formats
 * @version     0.0.7
 * @file        datatable.exportable.js
 * @author      Karl Saunders
 * @contact     mobius1@gmx.com
 * @copyright   Copyright 2017 Karl Saunders
 *
 *
 * This source file is free software, available under the following license:
 *   MIT license - https://github.com/Mobius1/Vanilla-DataTables/blob/master/LICENSE
 *
 * This source file is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE. See the license files for details.
 *
 * For details please refer to: https://github.com/Mobius1/Vanilla-DataTables
 */
if (window.DataTable) {
    DataTable.extend("exportable", function(instance, config, utils) {

        /**
         * Default configuration
         * @type {Object}
         */
        var defaultConfig = {
            download: true,
            skipColumns: [],
            escapeHTML: true,

            // csv
            lineDelimiter: "\n",
            columnDelimiter: ",",
            includeHeadings: true,

            // sql
            tableName: "table",

            // json
            replacer: null,
            space: 4,

            // print
            modal: true
        };

        var Exporter = function() {};

        /**
         * Initialise instance of Exporter
         * @return {[type]} [description]
         */
        Exporter.prototype.init = function() {
            if (!this.initialised) {
                this.config = utils.extend(defaultConfig, config);

                this.initialised = true;
            }
        };

        Exporter.prototype.getRows = function(config) {
            config = config || this.config;

            var that = this,
                rows = [];

            // Selection or whole table
            if (config.pages) {
                // Page number
                if (!isNaN(config.pages)) {
                    rows = rows.concat(instance.pages[config.pages - 1]);
                } else if (Array.isArray(config.pages)) {
                    // Array of page numbers
                    utils.each(config.pages, function(select) {
                        rows = rows.concat(instance.pages[select - 1]);
                    });
                }
            } else {
                rows = rows.concat(instance.table.rows);
            }

            return rows;
        };

        /**
         * Get the congif object
         * @param  {Object} config Export options
         * @return {Object}
         */
        Exporter.prototype.getConfig = function(config) {
            if (config && utils.isObject(config)) {
                return utils.extend(utils.extend({}, this.config), config)
            }

            return this.config;
        };

        Exporter.prototype.stripHTML = function(content) {
            /* https://github.com/sstephenson/prototype/blob/5fddd3e/src/prototype/lang/string.js#L285 */
            return content.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?(\/)?>|<\/\w+>/gi, '');
        };

        /**
         * Export with options
         * @param  {Object} config Export options
         * @return {Void}
         */
        Exporter.prototype.export = function(config) {
            config = this.getConfig(config);
            switch (config.type.toLowerCase()) {
                case "json":
                    this.toJSON(config);
                    break;
                case "sql":
                    this.toSQL(config);
                    break;
                case "csv":
                    this.toCSV(config);
                    break;
            }
        };

        /**
         * Export to json
         * @param  {Object} config JSON options
         * @return {String}        JSON string
         */
        Exporter.prototype.toJSON = function(config) {

            config = this.getConfig(config);

            config.type = "json";

            var str = "",
                data = [],
                o = config,
                table = instance.table,
                rows = this.getRows(config);

            utils.each(rows, function(row, n) {
                data[n] = data[n] || {};

                utils.each(row.cells, function(cell, i) {
                    if (!cell.hidden && o.skipColumns.indexOf(cell.index) < 0) {
                        data[n][table.header.cells[cell.index].content] = rows[n].cells[cell.index].content;
                    }
                })
            });

            // Convert the array of objects to JSON string
            str = JSON.stringify(data, o.replacer, o.space);

            if (config.escapeHTML) {
                str = this.stripHTML(str)
            }

            if (o.download) {
                str = "data:application/json;charset=utf-8," + str;
                this.download(str, config);
            }

            return str;
        };

        /**
         * Export to csv
         * @param  {Object} config CSV options
         * @return {String}        CSV string
         */
        Exporter.prototype.toCSV = function(config) {
            config = this.getConfig(config);

            config.type = "csv";

            var str = [],
                data = [],
                o = config,
                table = instance.table,
                rows = this.getRows(config);

            // Headings as first row
            if (config.includeHeadings) {
                // Convert table headings to column names
                utils.each(table.header.cells, function(cell) {
                    if (!cell.hidden && o.skipColumns.indexOf(cell.index) < 0) {
                        str += cell.content + o.columnDelimiter;
                    }
                });

                // Remove trailing column delimiter
                str = str.trim().substring(0, str.length - 1);

                // Apply line delimiter
                str += o.lineDelimiter;
            }

            utils.each(rows, function(row, n) {
                data[n] = data[n] || {};

                utils.each(row.cells, function(cell, i) {
                    if (!cell.hidden && o.skipColumns.indexOf(cell.index) < 0) {
                        str += cell.content + o.columnDelimiter;
                    }
                });

                // Remove trailing column delimiter
                str = str.trim().substring(0, str.length - 1);

                // Apply line delimiter
                str += o.lineDelimiter;
            });

            // Remove trailing line delimiter
            str = str.trim().substring(0, str.length - 1);

            if (config.escapeHTML) {
                str = this.stripHTML(str)
            }

            if (o.download) {
                str = "data:text/csv;charset=utf-8," + str;
                this.download(str, config);
            }

            return str;
        };

        /**
         * Export to sql
         * @param  {Object} config SQL options
         * @return {String}        SQL string
         */
        Exporter.prototype.toSQL = function(config) {
            config = this.getConfig(config);

            config.type = "sql";

            var o = config,
                table = instance.table,
                rows = this.getRows(config);

            // Begin INSERT statement
            var str = "INSERT INTO `" + o.tableName + "` (";

            // Convert table headings to column names
            utils.each(table.header.cells, function(cell) {
                if (!cell.hidden && o.skipColumns.indexOf(cell.index) < 0) {
                    str += "`" + cell.content + "`,";
                }
            });

            // Remove trailing comma
            str = str.trim().substring(0, str.length - 1);

            // Begin VALUES
            str += ") VALUES ";

            // Iterate rows and convert cell data to column values
            utils.each(rows, function(row) {
                str += "(";

                utils.each(row.cells, function(cell) {
                    if (!cell.hidden && o.skipColumns.indexOf(cell.index) < 0) {
                        str += "`" + cell.content + "`,";
                    }
                });

                // Remove trailing comma
                str = str.trim().substring(0, str.length - 1);

                // end VALUES
                str += "),";
            });

            // Remove trailing comma
            str = str.trim().substring(0, str.length - 1);

            // Add trailing colon
            str += ";";

            if (config.escapeHTML) {
                str = this.stripHTML(str)
            }

            if (o.download) {
                str = "data:application/sql;charset=utf-8," + str;
                this.download(str, config);
            }

            return str;
        };

        /**
         * Trigger download
         * @param  {String} str The formatted file contents
         * @return {Void}
         */
        Exporter.prototype.download = function(str, config) {

            // Download
            if (str) {
                // Filename
                var filename = config.filename || "datatable_export";
                filename += "." + config.type;

                str = encodeURI(str);

                // Create a link to trigger the download
                var link = document.createElement("a");
                link.href = str;
                link.download = filename;

                // Append the link
                document.body.appendChild(link);

                // Trigger the download
                link.click();

                // Remove the link
                document.body.removeChild(link);
            }
        };

        /**
         * Print table
         * @return {Void}
         */
        Exporter.prototype.print = function(config) {

            if (config && utils.isObject(config)) {
                config = utils.extend(this.config, config);
            }

            var table = document.createElement("table"),
                thead = document.createElement("thead"),
                tbody = document.createElement("tbody");

            table.appendChild(thead);
            table.appendChild(tbody);

            utils.each(instance.table.header.cells, function(cell) {
                thead.appendChild(cell.node.cloneNode(true));
            });

            utils.each(instance.table.rows, function(row) {
                tbody.appendChild(row.node.cloneNode(true));
            });

            // Open new window
            var w = window.open();

            // Append the table to the body
            w.document.body.appendChild(table);

            if (config.modal) {
                // Print
                w.focus(); // IE
                w.print();
            }
        };

        /**
         * Destroy instance of Exporter
         * @return {[type]} [description]
         */
        Exporter.prototype.destroy = function() {
            if (this.initialised) {
                this.initialised = false;
            }
        };

        return new Exporter();
    });
}