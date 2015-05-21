
var pagedTable = (function (GLOB) {
    return function (HTMLTable, entryPerPage, pagerConfig) {
        var table = HTMLTable,
            tBody = table.tBodies[0],
        // ��������� �������� ������������:
            pConfig = {
                toStart: "&lt;&lt;",
                toPrev: "&lt;&lt;",
                toNext: "&gt;",
                toEnd: "&gt;&gt;",
                linkPerPage: 10,
                linkTag: "span",
                template: "<span>Page: %p from %c (rows %r)</span><span>%n</span>",
                onAfterInit: undefined,
                onNavClick: undefined
            },
        // ����� �������:
            tableStyle = tBody.currentStyle || GLOB.getComputedStyle(tBody),
        // ��������� � ������ ������� ��� �����������:
            linksContainer = table.tFoot.rows[0].cells[0],
        // ������� "��������"
            currentPage = 0,
        // ������������ ������ �����������:
            linksSet,
        // ����� ���-�� ������:
            linksCnt,
        // ������ �� "��������":
            offset,
        // ������ �� ������ �������:
            trRefs;

        function copyRows(rows) {
            var copied = [],
                i;
            for (i = 0; i < rows.length; i += 1) {
                copied.push(rows.item(i));
            }
            return copied;
        }

        function renderLinks(curPage) {
            // ���������� ������ ������������ ����������� ������� ��������:
            var curSetKey = Math.floor(curPage / pConfig.linkPerPage),
                template  = pConfig.template,
                pagerHTML = "<" + pConfig.linkTag + " id=\"0\">" + (pConfig.toStart || "&lt;&lt;") + "</" + pConfig.linkTag + ">",
                setKey    = 0,
                i;
            // ���� �� ����� ���� � ������ �������� ������ "����������" �� ����������:
            if (curSetKey > 0) {
                pagerHTML += "<" + pConfig.linkTag + " id=\"" + (linksSet[curSetKey][0] - 1) + "\">" + (pConfig.toPrev || "&lt;") + "</" + pConfig.linkTag + ">";
            }
            for (i = 0; i < linksSet[curSetKey].length; i += 1) {
                setKey = linksSet[curSetKey][i];
                pagerHTML += "<" + pConfig.linkTag + " id=\"" + setKey + "\"" + (setKey === curPage ? " class=\"current\"" : "") + ">" + (setKey + 1) + "</" + pConfig.linkTag + ">";
            }
            // ���� �� ����� ���� � ��������� �������� ������ "���������" �� ����������:
            if (curSetKey < linksSet.length - 1) {
                pagerHTML += "<" + pConfig.linkTag + " id=\"" + (linksSet[curSetKey + 1][0]) + "\">" + (pConfig.toNext || "&gt;") + "</" + pConfig.linkTag + ">";
            }
            // ������ "� �����":
            pagerHTML += "<" + pConfig.linkTag + " id=\"" + (linksCnt - 1) + "\">" + (pConfig.toEnd || "&gt;&gt;") + "</" + pConfig.linkTag + ">";
            // ������������ ������ � ��������� ���� html-�� ���� ���:
            linksContainer.innerHTML = template.replace(/%n/g, pagerHTML).
                replace(/%p/g, String(curPage+1)).
                replace(/%r/g, String(trRefs.length)).
                replace(/%c/g, linksCnt);
        }

        function renderTableState(start, offset) {
            var startRow = start * offset,
                endRow = Math.min(trRefs.length, startRow + offset),
                i;
            // ������� tBody �� �������� (tBody.innerHTML - �� ��������� � IE)
            while (tBody.firstChild) {
                tBody.removeChild(tBody.firstChild);
            }
            for (i = startRow; i < endRow; i += 1) {
                tBody.appendChild(trRefs[i]);
            }
            renderLinks(currentPage);
        }
        function setupPager(all, offset) {
            /* ����� �� ������� ������ ����������� ������:
             * [ [0,1,2,3], [4,5,6,7], ... [..., all - 1] ]
             * ������ ��������� (������������) ����� ����� = offset
             * ����� � renderLinks() ����� �� ������ "��������" ���������� � �����
             * ������������ ��� ���������:
             * Math.floor(start / offset) � ����� ������
             * �������� �� ������ ������ ����.
             */
            var linksSet = [],
                key,
                i;
            for (i = 0; i < all; i += 1) {
                key = Math.floor(i / offset);
                if (linksSet[key] === undefined) {
                    linksSet[key] = [];
                }
                linksSet[key].push(i);
            }
            return linksSet;
        }

        function mergeObjects(defaults, override) {
            var merged = {},
                p;
            for (p in defaults) {
                if (defaults.hasOwnProperty(p)) {
                    if (override.hasOwnProperty(p)) {
                        merged[p] = override[p];
                    } else if (Object.prototype.toString.call(override[p]) === "[object Object]") {
                        merged[p] = mergeObjects(defaults[p], override[p]);
                    } else {
                        merged[p] = defaults[p];
                    }
                }
            }
            return merged;
        }
        // ���������� ���������� "������"
        linksContainer.onclick = function (e) {
            var event = e || GLOB.event,
                target = event.target || event.srcElement,
                start = 0;
            // ��������� "�����" ������ �� ��������� ����������
            if (target.tagName.toUpperCase() === pConfig.linkTag.toUpperCase() && isNaN(parseInt(target.id, 10)) === false) {
                start = parseInt(target.id, 10);
                // ���� callback-�-��� ���� � ��� ������� true � �������� �� �� ������� ��������
                if ((pConfig.onNavClick && !pConfig.onNavClick(start)) ^ start !== currentPage) {
                    currentPage = start;
                    renderTableState(start, entryPerPage);
                }
            }
        };
        // ������� �������
        pConfig  = mergeObjects(pConfig, pagerConfig);
        offset   = pConfig.linkPerPage;
        trRefs   = copyRows(tBody.children);
        linksCnt = Math.ceil(trRefs.length / entryPerPage);
        // ������ ������ ����������� ����� ��� �����������
        linksSet = setupPager(linksCnt, offset);
        // ��������� �����������, ����� ������ ������� �������������
        renderTableState(currentPage, entryPerPage);
        // ������������ ������� "����� �������������":
        pConfig.onAfterInit && pConfig.onAfterInit(table);
    };
}(this));