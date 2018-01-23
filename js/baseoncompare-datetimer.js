/**
 * 基于另一个时间值来计算同比时间的选择器 v2.0
 * Created by harry on 2017/5/30.
 */


// Follow the UMD template
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Make globaly available as well
        define(['moment', 'jquery'], function (moment, jquery) {
            //if (!jquery.fn) jquery.fn = {}; // webpack server rendering
            return (root.boctimer = factory(moment, jquery));
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node / Browserify
        //isomorphic issue
        var jQuery = (typeof window != 'undefined') ? window.jQuery : undefined;
        if (!jQuery) {
            jQuery = require('jquery');
            if (!jQuery.fn) jQuery.fn = {};
        }
        //var moment = (typeof window != 'undefined' && typeof window.moment != 'undefined') ? window.moment : require('moment');
        module.exports = factory(require('moment'), jQuery);
    } else {
        // Browser globals
        root.boctimer = factory(root.moment, root.jQuery);
    }
}(this, function(moment, $) {
    //定义时间插件
    var BOCTimer = function (element, options,cb) {

        //default settings for options
        this.parentEl='body';
        this.element=$(element);
        this.bocDateTime=moment();
        this.basedTimerId='';
        this.granularity=["hours", "days", "weeks", "months", "quarters", "years"];
        //默认基准时间为当前时间
        this.defaultBasedTime=moment().format('YYYY/MM/DD HH:mm:ss');
        this.dateFormat='YYYY/MM/DD HH:mm';
        this.fastOffsetValues= {
            hours: [0.25,0.5, 1, 3, 6, 12],
            days: [1, 2, 3, 4,7,15],
            weeks: [1, 2, 3,4],
            months: [1, 2, 3, 6]
        };
        this.offsetMap={
            hours:[0.25,0.5,1,2,3,6,12],
            days:[1,2,3,7,15],
            weeks:[1,2,3,4],
            months:[1,2,3,6],
            quarters:[1,2,3],
            years:[1,2]
        };
        this.currentGranularityType='hours';
        this.currentOffsetValue=0;
        this.isDisplayInElement=false;//是否将计算后的时间显示在element控件上
        this.flag=true;

        //some state information
        this.isShowing=false;
        this.callback=function () {};

        //custom options from user
        if (typeof options !== 'object' || options === null)
            options = {};

        //allow setting options with data attributes
        //data-api options will be overwritten with custom javascript options
        options = $.extend(this.element.data(), options);

        //html template for the picker UI
        if(typeof options.template!=='string' && !(options.template instanceof $)){
            options.template=
                '<div class="boc-timer" style="display: none;">'+
                //快速选择区域
                '<div class="fast-wrapper">'+
                '<h5>快捷选择</h5>'+
                '<ul class="fast-list">'+
                /*<li class="fast-list-item">
                 <ul>
                 <li><a href="#" class="fast-sel-btn" data-fast-type="hours" data-fast-value="0.5"><span>0.5小时前</span></a></li>
                 <li><a href="#" class="fast-sel-btn" data-fast-type="hours" data-fast-value="1"><span>1小时前</span></a></li>
                 </ul>
                 </li>*/
                '</ul>'+
                '</div>'+
                //下拉框选择区域
                '<div class="dropdown-list-Wrapper">'+
                '<select class="dropdown-granu-list">'+
                /*<option value="hours">小时</option>
                 <option value="days">天</option>
                 <option value="weeks">周</option>
                 <option value="months">月</option>
                 <option value="quarters">季度</option>
                 <option value="years">年</option>*/
                '</select>'+
                '<div class="dropdown-list-offset">'+
                '<input type="text" name="" class="dropdown-list-offset-inp">'+
                '<div class="dropdown-list-offset-con">'+
                /*<div class="dropdown-offset-item">4</div>
                 <div class="dropdown-offset-item">12</div>
                 <div class="dropdown-offset-item">24</div>*/
                '</div>'+
                '</div>'+
                '<button class="btn-calculate">OK</button>'+
                '</div>'+
                '</div>';

        }
        this.parentEl=(options.parentEl && $(options.parentEl).length)? $(options.parentEl):$(this.parentEl);
        this.container=$(options.template).appendTo(this.parentEl);

        // handle all the possible options overriding defaults
        if(typeof options.dateFormat ==='string')
            this.dateFormat=options.dateFormat;

        if(typeof options.basedTimerId ==='string')
            this.basedTimerId=options.basedTimerId;

        if(typeof options.defaultBasedTime ==='string')
            this.defaultBasedTime=moment(options.defaultBasedTime).format('YYYY/MM/DD HH:mm:ss');

        if(typeof options.fastOffsetValues==='object'){
            if(typeof options.fastOffsetValues.hours==='object')
                this.fastOffsetValues.hours=options.fastOffsetValues.hours;
            if(typeof options.fastOffsetValues.days==='object')
                this.fastOffsetValues.days=options.fastOffsetValues.days;
            if(typeof options.fastOffsetValues.weeks==='object')
                this.fastOffsetValues.weeks=options.fastOffsetValues.weeks;
            if(typeof options.fastOffsetValues.months==='object')
                this.fastOffsetValues.months=options.fastOffsetValues.months;
        }

        if(typeof options.offsetMap==='object'){
            if(typeof options.offsetMap.hours==='object')
                this.offsetMap.hours=options.offsetMap.hours;
            if(typeof options.offsetMap.days==='object')
                this.offsetMap.days=options.offsetMap.days;
            if(typeof options.offsetMap.weeks==='object')
                this.offsetMap.weeks=options.offsetMap.weeks;
            if(typeof options.offsetMap.months==='object')
                this.offsetMap.months=options.offsetMap.months;
            if(typeof options.offsetMap.quarters==='object')
                this.offsetMap.quarters=options.offsetMap.quarters;
            if(typeof options.offsetMap.years==='object')
                this.offsetMap.years=options.offsetMap.years;
        }

        if(typeof options.currentGranularityType ==='string')
            this.currentGranularityType=options.currentGranularityType;

        if(typeof options.currentOffsetValue ==='string')
            this.currentOffsetValue=options.currentOffsetValue;

        if(typeof options.isDisplayInElement ==='boolean')
            this.isDisplayInElement=options.isDisplayInElement;

        if(typeof options.flag ==='boolean')
            this.flag=options.flag;

        if(typeof cb==='function'){
            this.callback=cb;
        }

        //render ui by options

        //fast-list render
        var fastListHtml='';
        for(var g in this.fastOffsetValues){

            fastListHtml+='<li class="fast-list-item">';
            fastListHtml+='<ul>';
            for(var l=0;l<this.fastOffsetValues[g].length;l++){

                var item=this.fastOffsetValues[g][l],
                    gName=this.getGranularityName(g);
                var displayItem=item, displayName=gName;

                if(item<1 && g==='hours'){
                    //小数的小时转为分钟
                    displayItem=item*60;
                    displayName='分钟';
                }

                var liHtml='<li>'+
                    '<a href="#" class="fast-sel-btn" data-fast-type='+g+' data-fast-value="'+item+'">'+
                    '<span>'+displayItem+displayName+'前</span>'+
                    '</a>'+
                    '</li>';
                fastListHtml=fastListHtml+liHtml;
            }
            fastListHtml+='</ul>';
            fastListHtml+='</li>';
        }
        if(fastListHtml)
            this.container.find('.fast-list').append(fastListHtml);

        //dropdown-granu-list render
        var ddHtml='';
        for (var i = 0; i < this.granularity.length; i++) {
            ddHtml += '<option value="' + this.granularity[i] + '">' + this.getGranularityName(this.granularity[i]) + '</option>'
        }
        if(ddHtml)
            this.container.find('.dropdown-granu-list').append(ddHtml);

        //dropdown-list-offset-con render
        this.granularityValueList($('.dropdown-granu-list :selected').val());


        //
        //event listener
        //
        this.container.find('.fast-wrapper')
            .on('click.boctimer','.fast-sel-btn',$.proxy(this.clickFastSeleted,this));

        this.container.find('.dropdown-list-Wrapper')
            .on('change.boctimer','.dropdown-granu-list',$.proxy(this.selectGranularity,this))
            .on('focus.boctimer','.dropdown-list-offset-inp',$.proxy(this.showGranularityValues,this))
            .on('click.boctimer','.dropdown-offset-item',$.proxy(this.selectedGranularityValue,this))
            .on('click.boctimer','.btn-calculate',$.proxy(this.clickCalculate,this));

        if (this.element.is('input') || this.element.is('button')) {
            this.element.on({
                'click.boctimer': $.proxy(this.show, this),
                'focus.boctimer': $.proxy(this.show, this)/*,
                 'keyup.boctimer': $.proxy(this.elementChanged, this),
                 'keydown.boctimer': $.proxy(this.keydown, this)*/
            });
        } else {
            this.element.on('click.boctimer', $.proxy(this.toggle, this));
        }


    }

    //方法
    BOCTimer.prototype = {
        constructor:BOCTimer,

        move:function () {
            var parentOffset={top:0,left:0},
                containerTop;
            var parentRightEdge=$(window).width();
            if(!this.parentEl.is('body')){
                parentOffset={
                    top:this.parentEl.offset().top-this.parentEl.scrollTop(),
                    left:this.parentEl.offset().left-this.parentEl.scrollLeft()
                };
                parentRightEdge=this.parentEl[0].clientWidth+this.parentEl.offset().left;
            }
            containerTop=this.element.offset().top+this.element.outerHeight()-parentOffset.top;

            this.container.css({
                top:containerTop,
                left:this.element.offset().left-parentOffset.left,
                right:'auto'
            });
            if (this.container.offset().left + this.container.outerWidth() > $(window).width()) {
                this.container.css({
                    left: 'auto',
                    right: 0
                });
            }

        },

        show:function () {

            if(this.isShowing) return;

            // Create a click proxy that is private to this instance of boctimer, for unbinding
            this._outsideClickProxy = $.proxy(function(e) { this.outsideClick(e); }, this);

            // Bind global timerpicker mousedown for hiding and
            $(document)
                .on('mousedown.boctimer', this._outsideClickProxy)
                // and also close when focus changes to outside the picker (eg. tabbing between controls)
                .on('focusin.boctimer', this._outsideClickProxy);

            // Reposition the picker if the window is resized while it's open
            $(window).on('resize.boctimer', $.proxy(function(e) { this.move(e); }, this));


            this.container.show();
            this.move();
            this.element.trigger('show.boctimer', this);
            this.isShowing=true;
        },

        hide:function () {
            if(!this.isShowing) return;

            this.container.hide();
            this.isShowing=false;
        },

        toggle: function(e) {
            if (this.isShowing) {
                this.hide();
            } else {
                this.show();
            }
        },

        outsideClick: function(e) {
            var target = $(e.target);
            // if the page is clicked anywhere except within the boctimer/button
            // itself then call this.hide()
            if (
                // ie modal dialog fix
            e.type == "focusin" ||
            target.closest(this.element).length ||
            target.closest(this.container).length ||
            target.closest('.boc-timer').length
            ){
                return;
            }
            this.hide();
            this.element.trigger('outsideClick.boctimer', this);
        },

        clickFastSeleted:function (e) {
            var target=$(e.target);
            if(target.is('li'))
                target=target.children('a');
            if(target.is('span'))
                target=target.parent('a');

            var type = target.data('fast-type');
            var fastValue = target.data('fast-value');
            this.currentGranularityType = type;
            this.currentOffsetValue = fastValue;
            this.calculation();
            this.container.find('.fast-list-item a').removeClass('btn-active');
            $(target).addClass('btn-active');

            this.container.find('.dropdown-list-offset-con').hide();
            //this.hide();
            this.apply(e);
            this.resetUI(2);
            e.preventDefault();

        },

        selectGranularity:function (e) {
            this.granularityValueList($(e.target).val());
            $(e.target).parent()
                .find('.dropdown-list-offset')
                .find('.dropdown-list-offset-inp').val('');

        },
        resetUI:function (t) {
            if(t===1){
                this.container.find('.fast-list-item a').removeClass('btn-active');
            }
            else if(t===2){
                this.container.find(".dropdown-granu-list option:first").prop("selected", 'selected');
                this.container.find('.dropdown-list-offset-inp').val('');

            }
        },

        showGranularityValues:function (e) {
            $(e.target).parent().find('.dropdown-list-offset-con').show();

        },

        selectedGranularityValue:function (e) {
            $(e.target).parent().parent().find('.dropdown-list-offset-inp').val($(e.target).text());
            $(e.target).parent().parent().find('.dropdown-list-offset-con').hide();
        },

        clickCalculate:function (e) {
            $(e.target).parent().find('.dropdown-list-offset-con').hide();
            var sel = $(e.target).parent().find('.dropdown-granu-list'),
                inp = $(e.target).parent().find('.dropdown-list-offset-inp');

            if (inp.val() === '') return;
            if (inp.val().indexOf('-') > 0) {
                //this.element.val(inp.val());
            }
            else if (inp.val().length >= 4 && inp.val().length <= 14) {
                //this.element.val(moment(inp.val(), 'YYYY-MM-DD HH:mm-ss').format(this.dateFormat))
            }
            else {

                var type = sel.val(),
                    offsetValue = parseInt(inp.val() || 0);
                this.currentGranularityType = type;
                this.currentOffsetValue = offsetValue;
                this.calculation();
            }
            this.apply(e);
            this.resetUI(1);
            //this.hide();
        },
        apply:function (e) {
            this.hide();
            this.element.trigger('apply.boctimer',this);
        },

        getGranularityName: function (t) {
            var glName = "";
            switch (t) {
                case "hours":
                    glName = '小时';
                    break;
                case "days":
                    glName = '天';
                    break;
                case "weeks":
                    glName = '周';
                    break;
                case "months":
                    glName = '月';
                    break;
                case "quarters":
                    glName = '季度';
                    break;
                case "years":
                    glName = '年';
                    break;
            }
            return glName;
        },

        granularityValueList: function (val) {
            if(val===undefined){
                val='hours';
            }
            var offsets = this.offsetMap[val],
                str = "";
            for (var i = 0; i < offsets.length; i++) {
                str += '<div class="dropdown-offset-item">' + offsets[i] + '</div>';
            }
            $('.dropdown-list-offset-con').html(str);
        },

        calculation: function (timej) {
            var f = this.flag,
                ttt,
                v = this.currentGranularityType,
                offsetValue = parseFloat(this.currentOffsetValue);
            var baseCtrlTime='';
            if($('#' + this.basedTimerId).is('input')){
                baseCtrlTime=$('#' + this.basedTimerId).val();
            }
            else{
                baseCtrlTime=$('#' + this.basedTimerId).html();
            }
            var time = timej || baseCtrlTime || this.defaultBasedTime;

            if (f) {
                ttt=moment(new Date(time)).subtract(offsetValue,v);
            } else {
                ttt=moment(new Date(time)).add(offsetValue,'d');
            }


            if(this.element.is('input')){
                this.element.val(moment(ttt).format(this.dateFormat));
            }
            else if(this.isDisplayInElement){
                this.element.html(moment(ttt).format(this.dateFormat));
            }

            this.bocDateTime=ttt;
        },

        getBocDateTime:function () {
            return this.bocDateTime;
        },
        remove:function () {
            this.container.remove();
            this.element.off('boctimer');
            this.element.removeData();
        }

    }

    //挂载插件到$
    $.fn.boctimer = function (options,callback) {
        this.each(function() {
            var el = $(this);
            if (el.data('boctimer'))
                el.data('boctimer').remove();
            el.data('boctimer', new BOCTimer(el, options, callback));
        });
        return this;

    };

    return BOCTimer;

}));

