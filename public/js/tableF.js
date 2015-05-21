/**
 * Created by nikolay_ivanisenko on 14.05.2015.
 */
filterTable( document.getElementById("userTable"), {


        1: document.getElementById("online-filtre"),
        2: document.getElementById("school-filtre"),
        6: document.getElementById("apk-filtre"),


        0: new filterTable.Filter(document.getElementById("id-name"),
            function (value, filters, i) {
                return value.indexOf(filters[i].value) === 0;
            },
            "onkeyup"
        )
    }
);