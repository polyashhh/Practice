<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:strip-space elements="*"/>

  <xsl:template match="/report">
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Отчет по просроченным книгам</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 16px; }
          .meta { color: #555; margin-bottom: 12px; }
          .badge { display:inline-block; padding: 2px 8px; border: 1px solid #ddd; border-radius: 999px; margin-right: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; }
          tr.warn td { background: #fff7e6; }
          tr.critical td { background: #ffecec; }
          .muted { color:#666; font-size: 12px; }
        </style>
      </head>

      <body>
        <h2>Просроченные выдачи</h2>

        <div class="meta">
          <span class="badge">type: <b><xsl:value-of select="@type"/></b></span>
          <span class="badge">generated_at: <b><xsl:value-of select="@generated_at"/></b></span>
          <span class="badge">allowed_days: <b><xsl:value-of select="@allowed_days"/></b></span>
          <span class="badge">total_overdue: <b><xsl:value-of select="summary/total_overdue"/></b></span>
        </div>

        <xsl:choose>
          <xsl:when test="items/item">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Инв. №</th>
                  <th>Книга</th>
                  <th>Читатель</th>
                  <th>Выдана</th>
                  <th>Срок до</th>
                  <th>Дней просрочки</th>
                  <th>Место</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="items/item">
                  <xsl:variable name="od" select="number(days_overdue)"/>

                  <xsl:choose>
                    <xsl:when test="$od &gt;= 30">
                      <tr class="critical">
                        <xsl:call-template name="row"/>
                      </tr>
                    </xsl:when>
                    <xsl:when test="$od &gt;= 7">
                      <tr class="warn">
                        <xsl:call-template name="row"/>
                      </tr>
                    </xsl:when>
                    <xsl:otherwise>
                      <tr>
                        <xsl:call-template name="row"/>
                      </tr>
                    </xsl:otherwise>
                  </xsl:choose>

                </xsl:for-each>
              </tbody>
            </table>

            <div class="muted" style="margin-top:10px;">
              Источник данных: активные выдачи (date_returned = NULL).
            </div>
          </xsl:when>
          <xsl:otherwise>
            <p>Просроченных выдач не найдено.</p>
          </xsl:otherwise>
        </xsl:choose>

      </body>
    </html>
  </xsl:template>

  <xsl:template name="row">
    <td><xsl:value-of select="position()"/></td>
    <td><xsl:value-of select="inventory_number"/></td>
    <td>
      <b><xsl:value-of select="title"/></b><br/>
      <span class="muted"><xsl:value-of select="author"/> (<xsl:value-of select="year"/>)</span>
    </td>
    <td><xsl:value-of select="reader_card"/></td>
    <td><xsl:value-of select="date_taken"/></td>
    <td><xsl:value-of select="due_date"/></td>
    <td><xsl:value-of select="days_overdue"/></td>
    <td><xsl:value-of select="location"/></td>
  </xsl:template>

</xsl:stylesheet>