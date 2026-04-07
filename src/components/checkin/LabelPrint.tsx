const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAATJklEQVR42u1cfZScVXn/Pffe952v3YSmJKCgUgV73AXsIVYpYmYTIhL8Quss1o9jq2XXLIkUxFJPIO+8ERQPRUPzucEWDi1qd8CPQjECye4EaqGeHFHZLVqhWmpiN5GP7O7M+3HvffrHO7NsvnZm8rnx5J6z/+zM3Hfu7z4fv+d3nzvAyXFyHM9BR2VOz6NCZyeNDg/X5u+qvTQEAJjX2cml4WGG7zMAPgkgMxVKJQEApe5u08pHCwMDEgBKhYIFER/WWpjhFYs0MtI5ua6OjmH2i0UGEY7GZh0WgJ7niZHOTpoKmud5Yih9+mtlJP6Ayb6GmU4FcyZ5VQQAdpOk561ynusKfvk/vu/bqWB2DA/z1P9Ns2tUGCiJ0eFh6gJsM58pDAzIVt5/9AD0PFEY6aRSKQHuUu/OOdqhS6w1S8B8IRivl46TIqlARPsYK4ONhtFxSKDniOgJCPE9FfOWh/2rXqgvtObitplNA4C8N6ik+4vf1wZzwLYNYEUWsZBqzGbNb8vX9/wW2MvCKe95slwsmsOx/JYBLAwMyPqXX7hqw5tBqgfgD0rlng4iWB3DGg1mtgQccJcZEEQkhFQQygHAMFH0G4DuN7D921b2/nTfZ3meJwCgbjl5b6BNqbELDcwCMN5CbM9h5tMAtAupACIwW7AxDKKXAdoBwjCEeFxZO/ho7RlTnmMPxcWplTiXfIJ4wY0bzlEpdSODPyLdlDJhCGu0oWQnRW3eRnPXE4hlZhJSSZlKwURRTMz/FBl98+N+33PwPJEHRNn3NQBc4vf/sRXiz8H2vUI5rxFSga2BNQZsDdjaxMwnV0dEQoCkRAKsgA6rloieBOgfrR7/Rtm/9iUAKBQGZN2rjiiAUyfO+/3XSyFWCtdt19UKAGgwy/18tfVExCAYgJTKZGGi6GVm6w2t7L0jsbiNbxGOXAHmK6SbgolCWGMs1TaAiAhgqqO210Yxg4kYyRsZgJJuCiQVTBg8z4TV6dHqus1rrgmnWv0RAbA+4aLPrz6Ns7m7VCq1RFcrYLYaIHUUmAEDbIikUtkc4onx+xj8cyHVDdJxpK5WGETmMDeNE1SZhXKkctPQUfATrfW1j/l9Wz3PE75f5H1iZusA1sHLf371uTKX+45w3DfoiQkNwuFbXBMWyYBVqbQkIaCDKpjZEJE80s8BwQgnpcAMY4xf9nqL9WSJBtmaGrlt3lv7R1KlHiYp55og0BBHxeqmMUc2lFiCPErEP3mOZUuC4GTbRBxUSuldwcc3r7kmbAQiHYzf+b5vL/bWv95Vzr9BiNNNFBgiIfG7PphjJ9fu6OrEo9WXJt73xFeuC+rJszkAmanQXRLVjhdT42SfkKn0eSasHq14N6NBjCsTD+V553trvPOANEfs57qlkiiVus0Y6zVOtu08Uz0E8BIaoWt/U83fAtDMbACeuTUwkRNPjMVOru3yIT5tTam72+Q9Tza0wHrSWOCvX+K6mYd0GGgAqhXgGLBCKindVIKYjmF1DBBBKAdCKYC5TkMMAeJIJCQGJok7o8ZZGSCihMSAxCHE0Fhlco6e2POxoVXL7j0QxaF9VZTL5sxxqi86P5FO6hwTR0wHsNKDYGfqZFiHwSjA34flMrP5mYR8wYAFFJ1KhjpBtAjAJSqdmW2CasLnBIlD8zY2BAjhupRUNaiTaZAQIBKwRsNEEZitIWoJSEtSAsx7KLDnbnV+sxNJOTTpVeqVWtKTZd/X4aqNn3Az2TfG1XFNTbouMxsnk5UmjkZ1FH6ZDe4p+5/efZC3DwFYl/c2namj8JNE4jqVdmbrsNpakmJmJmInnZXWGlgdD1tttpHlpyzsDrYwQtIcJnqTYFxMRBepTM7R1QoYbGsW2WgINlo7mbZTQjN2G3z/I4XCgCwd0AKZqaNYdOZi3tPSSZ1tdNys9WmVySoTRd+lqr566xeX/nqq8jFvpJM7OoYZAEZGOmm0I/lfvbK52FvzRlel7hFO6m06mGgq3rJlK5QUQjmwJn6QrVw9902zhqarIBZ5GzqsFJ8mol4hlavDoBVOaYRyBBnzti1e7w+nVmZqMvYRmdO8DYtFOn2OrlabdSmtMlmlg8qaIW/pZ+qqSLnYZUpEplFtPb93k3rc7/35+Z+97ZI5s2d9y8m0XRpXxmMQOdNZu0qlJLN9ieO4Z9DrLU3xIlUXbAGgLuiWAbvVXzoC4DOLvP67GWaTk8nN10Gl2RjPQimK42gFgCv2i4H14Njlr/+6SuU+rIOKaTQxMxsnm5O6Wr17qPjpv5hOgmqmzr5s+R2p8NT0d1Qme1k8MRYDOJAWFstU2rHGPIdQf3Dw5qU/LgwMSJSAhiKA54k8ukTZX6jn93jZ9jNe9Q2Vyrwvrk40a4lMQhhhqHOL3/PzOlcWAFOpu9tc9LmvtTPTJSYOCcyyUcZTbkrqoPr0KO/sLRQODTygtnDPE5vXXBM+v/vpK+KgUnLaZjkkFSV0p057ACfX7hitn9VB1DV489Ifz+/pd0rd3aYpBcX3bdlfqAsDA3L7Jr8y9+k5HzRRsMVJZ2V9/kZurFIZZWA+VgvkAgBEYSCR4t228ALpuPOsMbYRraCaxGGsvnrE9yMU9s5MLQ/ft2CmX6xZEw6t7O3W1YnrQLRDpTNSZbLKyeQkCRnrsPpNE4y/47Fbrn4+AaI3bnnDurtNoVCQpVK3sWbswyYOd0jHJRxEu5yqYVodA+Ar4Hmi7BcNAIjR4blUC0lvlcoBNZqI2ahUWpgofPQxf9m2VuWfacgr1841aHBl71elYzug9RIThT0mij4K6PMGb+r5s8e+eN1OeJ44nGeWSiWT9zxV9q/fbYy9VkglmKcn9gQIE0cMITryePUbAWLP84Sqn5QRcD43WxwQQQp1J8A0Olw8kgU+g6gek18GsHm/Gj05IDrs84yy7+tCoSBL/tKB/Mr1N6h0+gIdhYYS0WJaN46rlQsBPDOELqHKkxZHr2NrUWPtB89GUsq4WpmQrrMNIC4X2cD3j2glVeruNvWTvnomnTwIOoLPGu3oqKnsfKeQagMhbKz/EYHBFwC4O6Ex9djFOJXZJuY1jdIppSJrzC+2rrjq/wDQYR5FTuvSJWDSTctH4RF14zGgh+OgEoHIrdXxdJDwRWwtBOEcAJg3sosFAMzv6XdAnAHb6Wuc5PACRNhZoyACJ/KoGc+rRk79FbP9pZAKPN3BEhGxNQDo9BqDsAIAqq/aQdxkzVtLwTF+R4bneaJU6jbE+HWt7uVpl84MBmYVCgMSQGKBI4AmUNSwxqba/IR2ACjVSrQTedS7GJioQk1pDAyA1XDHsKzpgUyJKfNLJAR4OgsGERsDAGfN7+93ai5AJzKA9TqdgCyDm1gNgRhmbi1+ThJpBu0gITAtggmZZBLytW07zB8CIM/zTmQAyfd9WygMSDCfycaApk+iSY1BNF4/p54k0gA/QyRAjbOqUamMIOB9AHio2dg5MwMgAcDu8188C4LOskZjWo9iZggBZh6tx09RJ9LMtJ3ZgusdCNNYoYkjgOhTBW/A7UpM+YS0wnxt860xlzrpnANmPd1aiIiFEADh2aQe7hKizoWkNk/qIAhJCInpe0SEiSOjMtnX7+JdS33ft/P7+0/IA6fJzbf4S2t0UxGwVk78aBIM+L6F54nBW5b9CuAfScdlBtsGlZwwYWCF696c91afu723N65rcSeM9Xme8n3fLvDWfcDJZC7QYdCojEvsLAwY0E8kRHp9QmPqpsyM+4VURA1bGohsQijbhMw+8PYbVr+27Pv6hAGRmboAm/fWtkkhb7fGMDU+2LJCOcTaPDu+0xkGQKVSKSHSr9TD8ptxUKkiERgbqBMkTBwZodRZblt2y0Ur7njDiQJivjgkkzY5sVGmMmeZOLJonAytdFyA8MD2Tb1x7ZgzsUD4vi0MDMiy3/O/sHyfSmcIU+rQaYKq1GHVCKnOTqezQwtuXHNe2fd1vW13Jo75Pf1O2V+ou1auW+Fm2z6qg4puUpEWOgqYoe6ZEj9fQb1jeDihOdJ82UaRRnL814Q6IaQOqwZCnKlS6S0Xe+vOL3V3m3pD5EwDb/um3vgdK9d8QmVyN9fORGRjj2cjU2lhYzNY9nueqsv5ewHoJ1YoBlcuG9Y6vstJZwXQlNQNIiFNFBgSYq6SzkOLvTWv9otFxgwCMe95avum3niBt/Zyx838g45Cw9Y217CUFMEQxLcAwEjnK03sey2wNDzM8DyRdVMrdFDdTcoRaKBQ7wViGGonlT5Dk+oHEXszCLyy7+v8irUXK5W6j60hZkvNdEQws3HSWanD6vcG/b6thUJhLwVe7CvvFDo7afOKT+1io5dJ5YpmYuErUYJUVB03wnHfs8jb8NbJMmkGgLfwpvXzRTr1IAMZq02TZ97MJCVsHAVC0rUAqKOjY6+wJg6kBuc9Tw2tuvqf4+p4v5Ntc8DctHxFIJbKYQtenKi+w3S8wXv7jX/3ZnKdzUQ028Zx820kDO2ks1LreMXgyr6fFQYGxL7XIw44UdkvmiSTdizTlfGyyuYcWNYtUS1g1kywvIs/v/p8N5V5GESnmjgyTYNnWTvZNieeGHtgm3/1V/Kepw50kHWQyYhLw8Nc9heaOOAPmDB4SmVzqllLZDCB6NmZYHlONvcICZpn4qjpVg5mNjKdVjqo/qfKyI/D80S5WDxgKDv4bvi+9TyPHr+178Xg5T3vMnG0vQl3ZhCRDioxGI/sTdKPseXddMf8VCrzCBHNM1EL4Fm20nGlNWYUUfDeR/+m92UvyZJNdqjup/gknGfxDbfONrk531DpzJK4Mm6T5qjJVjGuiT1xqn12Ktrz0tqhVX3Lj9iZcdPgDaqyv1AvuGnNnyg3/a8g+r2WLA9shVAEISo6rix6zP/MfzRaQ1MBfgpxpIWrNt4qpPPXJCRMFIJruoNQCiqdRTw+9v1q+8QH3rVnT9jsVYEjSZIX3LRuoXLd7wJoNzpuxW2ZpGQhpbVB9J6hL/R9v27NjShi0wV4jfBxl7/xEpLieli+EIxTANYk5LOW+a65Pz3lb2u9KoRjdJW1Dl7XTeveLVLufcyctrFuIdsyQ0grlZI6DLvLq/pKzYDXGoC1MbU37p233TOPjT4NEYLY/Oq/pzzwmIFXd9uuleuuJNe9F9ZKa02zDZR1ldlKx5VxWP3ENv/qe+ob0hxtO4RRKAzIjo79r6UezqW9w6owVq69SqUym4yOmRNJvTXw3JTU1Yme8qpld7YC3iEDONWtvWKR/CRrH8vb51RvSe7yN16n3NTtOgotbHPl2b7g2aDaO+j3bWoVvMMH8PiooVQYKIlSd7dZWNzoy0xmpa5WDJhFi+CxdFJCR0FPubj0zkMBD81IOTNNSfZQpPXLltmu4oavOtncDTqotHRbtJ5tpeMIHVQ/Wfb7/j7vDap//8qH9CG5wgkDnucJJK1tnPc3fs3N5D4VV8ZbusfCYCtIEkkJGwUfH1q17N5DtbwTC8Dkwh8XCgWx+9zF96pM9sq4MtbSDap6Zz8JqW0YfXjoC333Hy5405dyMwa75Lbk2cuXu7vOW/xtlclemTShtwie4wgSsqrj4P1HCjy0Yv7HCzzf9+38Hi/bPveMbzvp9KXxxNi01yAOKAy4rmTwHlOtvn/bLcuHatzxiHSYqZkOXr7PaxOnvfoBlUp3xRPjLYJnjXTTEtbuMlH07m23LP9hwh0X6iP1PWlGg+etbRPSeUimMu/QE+MtXvZmLd20stY8bycmLi9/6a+ebrY8O7EBrMW8d372tpyePet7hwSeZa0yGWV0/F+x1pc97vc9dzTAm3kuXMu2F157e0bPanvwkMHLZpWJwp+EJlryA3/5jlqJqY/GV545Wbim9szv6VeZU9q+pdKZrkMCL5dTJoqfGK9Ei6aAd9Q0yZkCIHnFIsH3bfsZ/HWVyV4WV8bjVsFzcm3KhMFQOPbCpT+8dflvC4WjL+jOCAALheS0K1/c0O9kch9qlaokv3HQpnRY3Vx9cfzyH9x2w1i9efyo7/xxB6/+2zTFDVelcu2book9MdAqeO1OXK3+y9iv+UPbN/XGzfzey+8KgJToenelgOoz0nVfY+IYLeh5NfAq3+KtO64sl30Dz6NjBd5xd+HaRR0mEcyXrvu61sFrc3Rl4v4hu6NQHioec/COO4CTXQvMZwvpMDV7BJokDCeuVL49yDu7USwyaknoWK9hRiQRYsQAUwvgqbhaeZCPM3jHHcCumsUR6CkThdzw+9R4ng6rW0btzj8tF4vmeIIHHGdFulwus+d54m7/c6Ovy19+kZtpO9voKCLsf5bLbGMnm3NMFD6pXt6z5MkvrQhQb5I/jmNmEGlmElL26SgcddI5t/bTULWfjmINgN222Y6OohFrxt7zyO2fm/COIVWZsRZYt0IA4pfe9S+ceeHih4QSb5aOe5Zy00I6rhCOK5htzEZ/PdD6o4/71+ya2mJ73OP3TJOwAGDRLV9byJbfBnAbgZ432pbLfu8zU9UanBwHUWMO+hILMM84+W0mCqpUKAyI0Y76JcihV34v4eQ4OU6Ofcb/A+z4Ep/2eQLsAAAAAElFTkSuQmCC";

interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
  fontSize?: number;
}

function buildLabelHtml({ volunteerName, teamName, date, fontSize = 14 }: LabelPrintProps): string {
  const teamLine = teamName
    ? `<div class="info">${teamName} &bull; ${date}</div>`
    : `<div class="info">${date}</div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    @page {
      size: 90mm 29mm !important;
      margin: 0 !important;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 90mm;
      height: 29mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 1.5mm 3mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      @page {
        size: 90mm 29mm !important;
        margin: 0 !important;
      }
      html, body {
        width: 90mm !important;
        height: 29mm !important;
        margin: 0 !important;
        padding: 1.5mm 3mm !important;
        overflow: hidden !important;
      }
      body {
        page-break-after: avoid;
        page-break-inside: avoid;
      }
    }
    .left {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 3mm;
      flex-shrink: 0;
    }
    .logo-img {
      height: 8mm;
      width: auto;
      object-fit: contain;
    }
    .content {
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      flex: 1;
    }
    .name {
      font-size: ${fontSize}pt;
      font-weight: bold;
      text-transform: uppercase;
      line-height: 1.1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .badge {
      margin-top: 0.5mm;
      font-size: 5pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 0.5px solid #000;
      border-radius: 1px;
      padding: 0.2mm 1.5mm;
      display: inline-block;
      width: fit-content;
    }
    .info {
      font-size: 5.5pt;
      color: #555;
      margin-top: 0.3mm;
    }
  </style>
</head>
<body>
  <div class="left">
    <img src="${LOGO_BASE64}" class="logo-img" />
  </div>
  <div class="content">
    <div class="name">${volunteerName}</div>
    <div class="badge">EM TREINAMENTO</div>
    ${teamLine}
  </div>
</body>
</html>`;
}

export function printLabel(props: LabelPrintProps) {
  const html = buildLabelHtml(props);

  // Create a hidden iframe so the print targets ONLY the label document,
  // not the parent page or any open dialogs.
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // already removed
    }
  };

  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    cleanup();
    return;
  }

  const doc = iframeWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for content to render, then print
  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframeWindow.focus();
        iframeWindow.print();
      } catch {
        // fallback: ignore
      }
      // Clean up after print dialog closes
      setTimeout(cleanup, 2000);
    }, 200);
  };

  // Fallback: if onload doesn't fire (some browsers with srcdoc-less iframes)
  setTimeout(() => {
    try {
      iframeWindow.focus();
      iframeWindow.print();
    } catch {
      // ignore
    }
    setTimeout(cleanup, 2000);
  }, 500);
}
