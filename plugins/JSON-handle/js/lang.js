
JH.mod.add([], 'lang', function (sModName, JH) {
	var _pri_s = {};
	_pri_s["data"] = {
		'zh-cn' : {
			'title_1' : '路径:',
			'title_2' : '键:',
			'title_3' : '链接',
			'title_4' : '自动渲染 JSON 文件',
			'title_5' : '面板显示',
			'title_6' : '图片展示的模式',
			'title_7' : '直接展示所有',
			'title_8' : '鼠标悬浮时',
			'title_9' : '点击JH的打开方式',
			'title_10' : '设置',
			'title_11' : '关于 JH 里边的广告',
			'title_12' : '成员数量展示模式',
			'title_13' : '仅数组',
			'title_14' : '数组与对象',
			'title_15' : '记住上次收起状态',
			'title_16' : '渲染样式',
			'title_17' : '炫丽',
			'title_18' : '精简',
			'title_19' : '黑',
			'title_20' : 'JSON 引擎',
			'title_21' : 'JS 原生 JSON',
			'title_22' : '将 key 按字母排序',
			'title_23' : '切换至极简模式',
			'title_24' : '当文件过大时',
			'title_25' : '任何时候',
			'title_26' : '字体使用:',
			'title_27' : '启动时显示',
			'title_28' : '鼠标左击时',
			'title_29' : '鼠标右击节点时',
			'title_30' : '仅点击面板按钮',
			'title_31' : '右键菜单（需要重启插件）',
			'button_1' : '修改',
			'button_2' : '-全部收起',
			'button_3' : '展开到选中节点',
			'button_4' : '+全部展开',
			'button_5' : '\u21e6撤销',
			'button_6' : '前进\u21e8',
			'button_7' : '滚动到选中节点',
			'button_8' : '保存',
			'button_9' : '复制',
			'button_10' : '联系 JH',
			'label_1' : '显示值',
			'label_2' : '显示图标',
			'label_3' : '文件夹风格',
			'label_4' : '自动展示图片',
			'label_5' : '展示数组长度',
			'msg_1' : '需要选择一个节点',
			'msg_2' : 'JSON格式错误 : 输入的内容无法被解析 !',
			'msg_3' : '请输入JSON字符串.....',
			'msg_4' : 'JSON格式错误', 
			'msg_5' : function (key, iLine) {
				return '@第' + iLine + '行';
			},
			'msg_6' : '复制成功!'
			, 'msg_8' : '当字符串值为图片URL时，展示图片'
			, 'msg_9' : '为什么会有广告?'
			, 'msg_10' : '给作者一点动力以持续地支持 JSON-handle 的开发和服务器花费， 并且他希望在这儿推荐更多更好的工具和应用给大家。'
			, 'msg_11' : '？关于推广'
			, 'tips_1' : '复制值'
			, 'tips_2' : '将值解URI编码'
			, 'tips_3' : '将值解Base64编码'
			, 'tips_4' : '将值压缩为一行'
		},
		'zh-tw' : {
			'title_1' : '路徑:',
			'title_2' : '鍵:',
			'title_3' : '鏈接',
			'title_4' : '自動渲染JSON文檔',
			'title_5' : '面板顯示',
			'title_6' : '圖片顯示的模式',
			'title_7' : '直接顯示所有',
			'title_8' : '滑鼠懸浮時',
			'title_9' : '點擊JH的打開模式',
			'title_10' : '設定',
			'title_11' : '關於JH裡的廣告',
			'title_12' : '成員數量顯示模式',
			'title_13' : '僅陣列',
			'title_14' : '陣列與物件',
			'title_15' : '記住上次收起狀態',
			'title_16' : '渲染風格',
			'title_17' : '炫麗',
			'title_18' : '精簡',
			'title_19' : '黑',
			'title_20' : 'JSON 引擎',
			'title_21' : 'JS 原生 JSON',
			'title_22' : '將 key 按字母排序',
			'title_23' : '切換至極簡模式',
			'title_24' : '當文檔過大時',
			'title_25' : '任何時候',
			'title_26' : '字體使用:',
			'title_27' : '啟動時顯示',
			'title_28' : '滑鼠左擊時',
			'title_29' : '滑鼠右擊節點時',
			'title_30' : '僅點擊面板按鈕',
			'title_31' : '右擊菜單(需要重啓挿件)',
			'button_1' : '更改',
			'button_2' : '-全部收起',
			'button_3' : '展開到選中節點',
			'button_4' : '+全部展開',
			'button_5' : '\u21e6撤銷',
			'button_6' : '前進\u21e8',
			'button_7' : '滾動到選中節點',
			'button_8' : '存儲',
			'button_9' : '複製',
			'button_10' : '聯系JH',
			'label_1' : '顯示值',
			'label_2' : '顯示圖標',
			'label_3' : '資料夾風格',
			'label_4' : '展示圖片',
			'label_5' : '展示數組長度',
			'msg_1' : '需要選擇一個節點',
			'msg_2' : 'JSON格式錯誤 : 輸入的內容無法被解析 !',
			'msg_3' : '請輸入JSON字串.....',
			'msg_4' : 'JSON格式錯誤', 
			'msg_5' : function (key, iLine) {
				return '@第' + iLine + '行';
			},
			'msg_6' : '複製成功!'
			, 'msg_8' : '當字串值為圖片URL時，展示圖片'
			, 'msg_9' : '為什麼會有廣告?'
			, 'msg_10' : '給作者一點動力以持續地支持 JSON-handle 的開發和服務器花費，並且他希望從這兒推薦更多更好的工具和程式給大家。.'
			, 'msg_11' : '？關於推廣'
			, 'tips_1' : '複製值'
			, 'tips_2' : '將值解URI編碼'
			, 'tips_3' : '將值解Base64編碼'
			, 'tips_4' : '將值壓縮為一行'
		},
		'en' : {
			'title_1' : 'Path:',
			'title_2' : 'Key:',
			'title_3' : 'Link',
			'title_4' : 'Auto render JSON',
			'title_5' : 'Show panel',
			'title_6' : 'Show img mode',
			'title_7' : 'Show all',
			'title_8' : 'When hover',
			'title_9' : 'Open JH mode',
			'title_10' : 'Setting',
			'title_11' : 'About Ad in JH',
			'title_12' : 'Show array length mode',
			'title_13' : 'Array only',
			'title_14' : 'Array & Object',
			'title_15' : 'Save latest collapse status of key',
			'title_16' : 'Render style',
			'title_17' : 'Rich',
			'title_18' : 'Smart',
			'title_19' : 'Dark',
			'title_20' : 'JSON engine',
			'title_21' : 'JS Native JSON',
			'title_22' : 'Sort keys',
			'title_23' : 'Switch to Minimalism Mode',
			'title_24' : 'When file size is too large',
			'title_25' : 'Anytime',
			'title_26' : 'Font:',
			'title_27' : 'When startup',
			'title_28' : 'When left click',
			'title_29' : 'When right click on node',
			'title_30' : 'Click panel button only',
			'title_31' : 'Contexts Menu(Need restart Extension)',
			'button_1' : 'Modify',
			'button_2' : '-Collapse all',
			'button_3' : 'Expand node',
			'button_4' : '+Expand all',
			'button_5' : '\u21e6Undo',
			'button_6' : 'Redo\u21e8',
			'button_7' : 'Scroll to node',
			'button_8' : 'Save',
			'button_9' : 'Copy',
			'button_10' : 'Contact JH',
			'title_12' : 'Show array length mode',
			'title_13' : 'Array only',
			'title_14' : 'Array & Object',
			'label_1' : 'Show value',
			'label_2' : 'Show ico',
			'label_3' : 'Folder style',
			'label_4' : 'Show img',
			'label_5' : 'Show array leng',
			'msg_1' : 'Must select a node',
			'msg_2' : 'JSON format error : Can\'t parse the input !',
			'msg_3' : 'Input JSON string.....',
			'msg_4' : 'JSON format error', 
			'msg_5' : function (key, iLine) {
				return '@line ' + iLine;
			},
			'msg_6' : 'Copied!'
			, 'msg_8' : 'When the value is string of image URL, show pictures automatically'
			, 'msg_9' : 'Why is there a Ad?'
			, 'msg_10' : 'A little power for author to support development and server cost of JSON-handle , & He hope recommend more great tools and application to all.'
			, 'msg_11' : '？About Ad'
			, 'tips_1' : 'Copy value'
			, 'tips_2' : 'Decoding value as URI'
			, 'tips_3' : 'Decoding value as Base64'
			, 'tips_4' : 'Compress the value into one line'
		}
	};
	var _pub_static = function () {var _pub = {}, _pri = {}, _pro = {};
		var _init = function (sLang) {
			_pri.lang = sLang;
			
		};

		_pri["lang"] = 'en';

		_pub["switchLang"] = function (sLang) {
			_pri.lang = sLang;
			return _pub;
		};

		_pub["setPage"] = function (sLang) {
			sLang = sLang || _pri.lang;
			JH.forIn(_pri_s.data[sLang], function (o, k) {
				$('.langID_' + k).html(_pub.getStr(k));
				$('.langTitleID_' + k).attr('title', _pub.getStr(k));
				$('.langValueID_' + k).attr('value', _pub.getStr(k));
			});
			$('.langID_data').each(function () {
				try{
					var oLang = JSON.parse(this.getAttribute('data-lang'));
					this.langDef || (this.langDef = this.innerHTML);
					var sStr = this.langDef;
					if(oLang[sLang]) {
						sStr = oLang[sLang];
					}else if(oLang.en) {
						sStr = oLang.en;
					}
					this['innerHTM'+'L'.charAt()] = sStr;
				}catch(e) {}
			});
		};

		_pub["getStr"] = function (sKey) {
			var sKey = _pri_s.data[_pri.lang][sKey];
			if(sKey.call) {
				return sKey.apply(sKey, arguments);
			}else{
				return sKey;
			}
		};

		_pub["getStrInLang"] = function (sKey, sLang) {
			sLang = sLang || _pri.lang;
			var sKey = _pri_s.data[sLang][sKey];
			if(sKey.call) {
				return sKey.apply(sKey, [arguments[0]].concat(arguments.slice(2)));
			}else{
				return sKey;
			}
		};

		switch(this+'') {
			case 'test':
				_pub._pri = _pri;
			case 'extend':
				_pub._pro = _pro;
				_pub._init = _init;
				break;
			default:
				delete _pub._init;
				delete _pub._pro;
				_init.apply(_pub, arguments);
		}
		return _pub;
	};

	

	return _pub_static;



});

