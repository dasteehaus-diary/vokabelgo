
// ==========================================================================
// KINO STUDIO V3: MASTER BLUEPRINT JAVASCRIPT
// ==========================================================================
const PIZZASCHWESTER_72_SEGMENTS = [
  {
    "id": 1,
    "start": 27.73,
    "end": 32.8,
    "text": "Fertig! Okay. Klingel-klingel! Klingel-klingel!",
    "vi": "Xong rồi! Được rồi. Kính coong! Kính coong!"
  },
  {
    "id": 2,
    "start": 33.73,
    "end": 37.2,
    "text": "Hallo? Hier der Pizzaladen! Möchten Sie gerne eine Pizza bestellen?",
    "vi": "A lô? Tiệm pizza xin nghe! Quý khách muốn đặt một chiếc pizza chứ ạ?"
  },
  {
    "id": 3,
    "start": 37.25,
    "end": 40.8,
    "text": "Ja, bitte! Ich möchte eine Pizza Supreme ohne Pilze.",
    "vi": "Vâng, làm ơn! Tôi muốn một chiếc pizza Supreme không cho nấm."
  },
  {
    "id": 4,
    "start": 40.75,
    "end": 44.0,
    "text": "Möchten Sie auch Knoblauchbrot? Ja, ich nehme auch Knoblauchbrot.",
    "vi": "Quý khách có lấy thêm bánh mì bơ tỏi không? Vâng, tôi lấy cả bánh mì bơ tỏi nữa."
  },
  {
    "id": 5,
    "start": 43.95,
    "end": 47.4,
    "text": "Gut, alles klar! Wird nicht lange dauern!",
    "vi": "Tuyệt, rõ rồi ạ! Sẽ không lâu đâu!"
  },
  {
    "id": 6,
    "start": 47.35,
    "end": 51.2,
    "text": "Brauchen Sie meine Adresse? Nein, ich kann Sie ja sehen! Wiederhören!",
    "vi": "Quý khách có cần địa chỉ của tôi không? Không, tôi nhìn thấy quý khách mà! Chào tạm biệt!"
  },
  {
    "id": 7,
    "start": 51.25,
    "end": 56.8,
    "text": "Wir brauchen eine Pizza Supreme, bitte, Pizzatante. Oh, aber ohne Pilze. Okay!",
    "vi": "Bọn cháu cần một chiếc pizza Supreme, làm ơn, cô làm pizza ơi. Ồ, nhưng không có nấm nhé. Được rồi!"
  },
  {
    "id": 8,
    "start": 56.85,
    "end": 60.8,
    "text": "Ich mach das Knoblauchbrot! Können wir so tun, als ob wir Schwestern sind, und der Pizzaladen unserer Mum gehört?",
    "vi": "Chị sẽ làm bánh mì bơ tỏi! Chúng mình có thể giả vờ như hai chị em, và tiệm pizza này là của mẹ không?"
  },
  {
    "id": 9,
    "start": 60.85,
    "end": 66.0,
    "text": "Oh ja, und wir schmeißen den Pizzaladen für sie, damit sie in den Urlaub fliegen kann. Ja! Nach Italien!",
    "vi": "Ồ được chứ, và chúng mình quán xuyến tiệm pizza giúp mẹ, để mẹ có thể đi máy bay đi nghỉ dưỡng. Vâng! Đến Ý!"
  },
  {
    "id": 10,
    "start": 72.05,
    "end": 75.8,
    "text": "Das Knoblauchbrot ist fertig. Klasse! Vergiss nicht das Freigetränk!",
    "vi": "Bánh mì bơ tỏi xong rồi. Tuyệt quá! Đừng quên nước ngọt tặng kèm đấy nhé!"
  },
  {
    "id": 11,
    "start": 76.85,
    "end": 79.6,
    "text": "Danke, Pizzaschwester! Bis nachher!",
    "vi": "Cảm ơn chị gái pizza! Hẹn lát nữa gặp lại!"
  },
  {
    "id": 12,
    "start": 85.85,
    "end": 90.2,
    "text": "Ich bin schon da! Oh, sehr schön! Es sind keine Pilze drauf?",
    "vi": "Tôi đến nơi rồi đây! Ồ, tuyệt quá! Trên bánh không có nấm chứ?"
  },
  {
    "id": 13,
    "start": 90.15,
    "end": 93.5,
    "text": "Nein, keine Pilze. Sehr gut.",
    "vi": "Không, không có nấm đâu. Tốt lắm."
  },
  {
    "id": 14,
    "start": 93.45,
    "end": 97.2,
    "text": "Nein, nein, den Karton können Sie nicht haben. Das ist unser einziger.",
    "vi": "Không, không, quý khách không thể lấy hộp các-tông này đâu. Đó là cái duy nhất của chúng tôi đấy."
  },
  {
    "id": 15,
    "start": 97.25,
    "end": 102.2,
    "text": "Gut... was mache ich denn jetzt? Nehmen Sie einfach nur die Pizza. Äh, okay.",
    "vi": "Được rồi... vậy bây giờ tôi làm sao đây? Quý khách cứ cầm lấy bánh pizza thôi. À, được rồi."
  },
  {
    "id": 16,
    "start": 103.65,
    "end": 106.8,
    "text": "Danke, Wiedersehen! Oh Mann!",
    "vi": "Cảm ơn, chào tạm biệt! Trời đất ơi!"
  },
  {
    "id": 17,
    "start": 107.35,
    "end": 112.0,
    "text": "Ich bin wieder da, Pizzaschwester! Oh nein, nicht schon wieder. Oh, ich kann's reparieren!",
    "vi": "Chị về rồi đây, em gái pizza! Ôi không, lại nữa rồi à. Ồ, chị sửa được mà!"
  },
  {
    "id": 18,
    "start": 112.05,
    "end": 117.2,
    "text": "Mum, kriegen wir ein neues Auto? Oh... Aber das hast du bekommen, als du 2 Jahre alt warst.",
    "vi": "Mẹ ơi, chúng con có được chiếc xe mới không? Ồ... Nhưng con đã nhận chiếc xe đó từ khi mới 2 tuổi rồi mà."
  },
  {
    "id": 19,
    "start": 117.25,
    "end": 120.6,
    "text": "Aber das Rad fällt immer wieder ab! Ich weiß.",
    "vi": "Nhưng cái bánh xe cứ bị rơi ra suốt thôi! Mẹ biết rồi."
  },
  {
    "id": 20,
    "start": 120.55,
    "end": 124.5,
    "text": "Aber an dem Auto hängen doch so viele Erinnerungen. Wie können Erinnerungen an einem Auto hängen?",
    "vi": "Nhưng chiếc xe đó gắn liền với biết bao kỷ niệm mà. Làm sao kỷ niệm lại có thể gắn vào một chiếc xe được ạ?"
  },
  {
    "id": 21,
    "start": 124.55,
    "end": 129.8,
    "text": "Na ja... Fertig! Ah, na ist doch toll! Siehst du? So gut wie neu!",
    "vi": "Thôi nào... Xong rồi! A, chẳng phải rất tuyệt sao! Con thấy chưa? Tốt như mới luôn!"
  },
  {
    "id": 22,
    "start": 129.85,
    "end": 134.8,
    "text": "Ist mein Auto zerkratzt? Diese Folge von Bluey heißt: Pizzaschwestern.",
    "vi": "Xe của con có bị trầy xước không? Tập phim Bluey này có tên là: Hai chị em bán Pizza."
  },
  {
    "id": 23,
    "start": 135.05,
    "end": 138.5,
    "text": "Was ist das denn Cooles, Muffin? Das ist ein Elektroauto!",
    "vi": "Cái gì mà ngầu thế hả Muffin? Đó là một chiếc xe hơi điện đấy!"
  },
  {
    "id": 24,
    "start": 138.45,
    "end": 143.8,
    "text": "Mein Dad hat ein neues Auto gekauft, und das haben wir dazu gekriegt! Das kann ja sogar ohne Pedale fahren!",
    "vi": "Bố em vừa mua một chiếc ô tô mới, và bọn em được tặng kèm chiếc này đấy! Xe này thậm chí chạy không cần bàn đạp luôn!"
  },
  {
    "id": 25,
    "start": 143.85,
    "end": 147.5,
    "text": "Ja, und es ist sehr, sehr teuer. Also sei vorsichtig damit, Muffin.",
    "vi": "Ừ, và nó rất, rất đắt tiền đấy. Nên em phải cẩn thận với nó nhé, Muffin."
  },
  {
    "id": 26,
    "start": 147.45,
    "end": 150.8,
    "text": "Können wir damit Pizzaschwestern spielen? Okay! Hurra!",
    "vi": "Chúng mình có thể chơi trò hai chị em bán pizza với chiếc xe này không? Được thôi! Hoan hô!"
  },
  {
    "id": 27,
    "start": 152.65,
    "end": 156.4,
    "text": "Okay, wir sind drei Schwestern, die einen Pizzaladen haben. Ja, gut!",
    "vi": "Được rồi, chúng mình là ba chị em có một tiệm bánh pizza nhé. Ừ, hay đấy!"
  },
  {
    "id": 28,
    "start": 156.65,
    "end": 161.8,
    "text": "Hm... Da ist gar kein Dach, wo wir das Pizzaschild festmachen können. Das ist ja auch ein Cabriolet!",
    "vi": "Hừm... Ở đây chẳng có mui xe để chúng mình gắn biển hiệu pizza lên cả. Xe này là xe mui trần mà!"
  },
  {
    "id": 29,
    "start": 161.85,
    "end": 165.2,
    "text": "Okay, na ja, wir brauchen das Schild ja nicht unbedingt.",
    "vi": "Được rồi, ừ thì, chúng mình cũng không nhất thiết phải cần biển hiệu đâu."
  },
  {
    "id": 30,
    "start": 165.35,
    "end": 167.5,
    "text": "Hallo? Sind da die Kunden?",
    "vi": "A lô? Khách hàng có ở đó không ạ?"
  },
  {
    "id": 31,
    "start": 167.65,
    "end": 172.2,
    "text": "Und dann machst du mit dem Fuß nur so... und der Kofferraum geht auf! Oh, cool!",
    "vi": "Và sau đó em chỉ cần dùng chân làm thế này... là cốp xe tự mở ra luôn! Ồ, ngầu thật đấy!"
  },
  {
    "id": 32,
    "start": 172.35,
    "end": 175.5,
    "text": "Hallo, Kunden! Das Telefon funktioniert nicht.",
    "vi": "Xin chào khách hàng! Điện thoại không hoạt động rồi."
  },
  {
    "id": 33,
    "start": 175.55,
    "end": 179.8,
    "text": "Ich frag sie einfach. Warte, Muffin, nein! Wir müssen das telefonisch klären!",
    "vi": "Để em hỏi thẳng họ luôn. Đợi đã, Muffin, không được! Chúng ta phải giải quyết qua điện thoại chứ!"
  },
  {
    "id": 34,
    "start": 180.35,
    "end": 184.8,
    "text": "Sie wollen eine Supreme! Okay, eine Supreme! Danke, Pizzaschwester!",
    "vi": "Họ muốn một chiếc bánh Supreme! Được rồi, một chiếc Supreme! Cảm ơn em gái pizza!"
  },
  {
    "id": 35,
    "start": 185.05,
    "end": 191.5,
    "text": "Eigentlich gehört unserer Mum der Pizzaladen. Sie hat immer ganz hart gearbeitet, und deswegen wollen wir, dass sie in den Urlaub fliegen kann!",
    "vi": "Thực ra tiệm pizza này là của mẹ bọn mình. Mẹ luôn làm việc rất chăm chỉ, và vì thế bọn mình muốn mẹ được đi máy bay đi nghỉ dưỡng!"
  },
  {
    "id": 36,
    "start": 191.65,
    "end": 196.2,
    "text": "Wow, jetzt können wir die Pizza ja richtig schnell ausliefern! Halt!",
    "vi": "Oa, bây giờ chúng mình có thể đi giao pizza cực kỳ nhanh rồi! Dừng lại!"
  },
  {
    "id": 37,
    "start": 196.25,
    "end": 200.5,
    "text": "Aber ich leg doch nur die Pizza rein. Es darf doch kein Dreck in mein neues Auto kommen!",
    "vi": "Nhưng chị chỉ đặt bánh pizza vào thôi mà. Không được để một tí bụi bẩn nào dính vào xe mới của em đâu đấy!"
  },
  {
    "id": 38,
    "start": 200.45,
    "end": 204.2,
    "text": "Was? Wieso? Weil es unglaublich viel Geld kostet!",
    "vi": "Cái gì? Tại sao? Vì nó tốn nhiều tiền khủng khiếp luôn đấy!"
  },
  {
    "id": 39,
    "start": 204.25,
    "end": 209.0,
    "text": "Oh, okay... Und was machen wir da jetzt? Wir müssen dann eben was anderes spielen.",
    "vi": "Ồ, được rồi... Vậy bây giờ chúng mình làm gì đây? Vậy thì chúng mình đành phải chơi trò khác thôi."
  },
  {
    "id": 40,
    "start": 209.05,
    "end": 213.8,
    "text": "Oh... Was kann man denn noch damit spielen? Eigentlich fahre ich damit immer nur rum.",
    "vi": "Ồ... Thế còn trò gì có thể chơi với chiếc xe này nữa? Thực ra em chỉ toàn lái nó chạy vòng quanh thôi."
  },
  {
    "id": 41,
    "start": 213.85,
    "end": 218.5,
    "text": "Okay, dann machen wir das! Füße abtreten! 'Tschuldigung!",
    "vi": "Được rồi, vậy thì chúng mình làm thế nhé! Lau chân đi đã! Xin lỗi nhé!"
  },
  {
    "id": 42,
    "start": 218.45,
    "end": 222.5,
    "text": "Ich will kein Dreck im Auto haben! Wir sind so weit, Muffin, nhưng bitte fahr auf keinen Fall zu...",
    "vi": "Em không muốn có vết bẩn nào trong xe đâu! Bọn chị sẵn sàng rồi, Muffin, nhưng làm ơn đừng bao giờ lái xe quá..."
  },
  {
    "id": 43,
    "start": 223.85,
    "end": 238.0,
    "text": "Wuhuhu! Ich fahr lieber.",
    "vi": "Wuhuhu! Tôi thích lái xe hơn."
  },
  {
    "id": 44,
    "start": 242.65,
    "end": 246.8,
    "text": "Hey, gleich sind die weißen Pfotenabdrücke drauf! Gefällt's dir auch, Trixie?",
    "vi": "Này, sắp có dấu chân trắng in lên rồi đấy! Em cũng thích chứ, Trixie?"
  },
  {
    "id": 45,
    "start": 246.85,
    "end": 252.0,
    "text": "Ach... Ich vermisse das alte Auto. Damit haben wir die Kinder nach der Geburt nach Hause gefahren.",
    "vi": "Chao ôi... Em nhớ chiếc xe cũ quá. Chiếc xe mà chúng ta đã chở lũ trẻ từ viện về nhà sau khi sinh đấy."
  },
  {
    "id": 46,
    "start": 252.25,
    "end": 256.5,
    "text": "Das hat Spaß gemacht! Darf ich bitte auch mal fahren? Na gut.",
    "vi": "Vui thật đấy! Cho cháu xin phép được lái một lần với nhé? Thôi được rồi."
  },
  {
    "id": 47,
    "start": 256.55,
    "end": 260.5,
    "text": "Alles klar, und los geht's! Hä? Was ist denn jetzt los?",
    "vi": "Tất cả đã sẵn sàng, và xuất phát nào! Hả? Có chuyện gì xảy ra thế này?"
  },
  {
    "id": 48,
    "start": 260.65,
    "end": 265.8,
    "text": "Oh, der Akku ist alle. Oh... Wir müssen ihn aufladen! Dad!",
    "vi": "Ôi, hết pin rồi. Ôi... Chúng ta phải sạc pin cho nó thôi! Bố ơi!"
  },
  {
    "id": 49,
    "start": 267.35,
    "end": 270.5,
    "text": "Okay! Der Akku lädt jetzt, Kinder.",
    "vi": "Được rồi! Pin đang sạc rồi đấy các con."
  },
  {
    "id": 50,
    "start": 270.45,
    "end": 274.5,
    "text": "Und wie lange dauert das mit dem Aufladen? So lange... Oh.",
    "vi": "Và việc sạc pin này mất bao lâu ạ? Lâu lắm đấy... Ôi."
  },
  {
    "id": 51,
    "start": 274.55,
    "end": 281.2,
    "text": "Was wollen wir spielen, bis wir wieder fahren können? Wir können ja weiter Pizzaschwestern spielen! Ja!",
    "vi": "Chúng mình muốn chơi trò gì trong lúc chờ xe chạy lại được đây? Chúng mình có thể tiếp tục chơi hai chị em bán pizza mà! Đúng rồi!"
  },
  {
    "id": 52,
    "start": 281.35,
    "end": 286.2,
    "text": "Also, Sie wollen eine Pizza Supreme mit extra Ananasstückchen drauf haben, ja? Jep!",
    "vi": "Vậy là, quý khách muốn một chiếc pizza Supreme có thêm những miếng dứa bên trên, đúng không ạ? Đúng thế!"
  },
  {
    "id": 53,
    "start": 286.25,
    "end": 289.5,
    "text": "Aber ohne Pilze, das ist ganz wichtig! Geht klar!",
    "vi": "Nhưng không có nấm nhé, điều đó rất quan trọng đấy! Rõ rồi ạ!"
  },
  {
    "id": 54,
    "start": 289.45,
    "end": 293.0,
    "text": "Wenn Sie doch Pilze drauf machen, dann wird... Okay, Wiederhören!",
    "vi": "Nếu các cô mà cho nấm vào, thì sẽ... Được rồi, chào tạm biệt quý khách!"
  },
  {
    "id": 55,
    "start": 293.05,
    "end": 296.2,
    "text": "Los kommt, wir legen ihm Pilze drauf! Ja!",
    "vi": "Nào mọi người ơi, chúng mình cùng rải nấm lên cho chú ấy đi! Vâng!"
  },
  {
    "id": 56,
    "start": 296.35,
    "end": 301.8,
    "text": "Bluey, was kann ich denn machen? Na ja, mein Lieferauto muss dringend repariert werden.",
    "vi": "Bluey ơi, em có thể làm gì được nhỉ? À, xe giao hàng của chị cần được sửa gấp đấy."
  },
  {
    "id": 57,
    "start": 301.85,
    "end": 304.5,
    "text": "Du kannst der Mechaniker sein! Okay!",
    "vi": "Em có thể làm thợ sửa xe! Được luôn!"
  },
  {
    "id": 58,
    "start": 309.35,
    "end": 313.2,
    "text": "Fertig! Hier ist Ihre Pizza!",
    "vi": "Xong rồi! Pizza của quý khách đây ạ!"
  },
  {
    "id": 59,
    "start": 313.15,
    "end": 315.8,
    "text": "Oh, klasse! Hier ist das Geld.",
    "vi": "Ồ, tuyệt quá! Tiền đây nhé."
  },
  {
    "id": 60,
    "start": 315.85,
    "end": 319.8,
    "text": "Wow, extra Ananas! Hey, Augenblick, was ist das denn?",
    "vi": "Oa, thêm dứa này! Này, khoan đã, cái gì thế này?"
  },
  {
    "id": 61,
    "start": 319.85,
    "end": 323.8,
    "text": "Lassen Sie sich die Pilze schmecken! Was? Du kleines...",
    "vi": "Chúc quý khách ngon miệng với món nấm nhé! Cái gì cơ? Con nhóc này..."
  },
  {
    "id": 62,
    "start": 324.05,
    "end": 329.2,
    "text": "Nochmal! Okay, danke, bis dann!",
    "vi": "Một lần nữa nào! Được rồi, cảm ơn nhé, hẹn gặp lại!"
  },
  {
    "id": 63,
    "start": 329.85,
    "end": 337.2,
    "text": "Du meine Güte, die Kunden haben 10 Pizzen bestellt! Zehn?! Sie haben gesagt, sie machen eine Pizzaparty, und wir sollen uns ruhig Zeit lassen.",
    "vi": "Trời đất ơi, khách hàng đặt tận 10 chiếc pizza liền! Mười cái cơ á?! Họ nói rằng họ sẽ tổ chức một bữa tiệc pizza, và bảo chúng mình cứ thong thả làm."
  },
  {
    "id": 64,
    "start": 337.25,
    "end": 344.5,
    "text": "Okay, ich fang dann mal an! Was macht das Auto, Mechaniker? Ich habe noch was angebaut, um das Auto ganz besonders schnell zu machen!",
    "vi": "Được rồi, vậy chị bắt đầu làm đây! Chiếc xe thế nào rồi hả bác thợ máy? Cháu vừa gắn thêm một bộ phận để làm cho xe chạy cực kỳ nhanh luôn đấy!"
  },
  {
    "id": 65,
    "start": 344.65,
    "end": 350.0,
    "text": "Oh wow, du bist ein guter Mechaniker! Danke! Alles klar! Ich mach dann das Knoblauchbrot!",
    "vi": "Ồ oa, em là một người thợ sửa xe giỏi đấy! Cảm ơn chị! Tất cả đã sẵn sàng! Chị sẽ đi làm bánh mì bơ tỏi đây!"
  },
  {
    "id": 66,
    "start": 350.35,
    "end": 357.8,
    "text": "Hey Mädels, der Akku ist aufgeladen. Ihr könnt wieder mit dem Auto fahren. Oh, danke. Du bist dann jetzt mit Fahren dran, Bluey. Ähm, ja... hast recht.",
    "vi": "Này các cô gái, pin đã được sạc đầy rồi đấy. Các con có thể lái xe trở lại rồi. Ồ, cảm ơn bố. Giờ đến lượt con lái xe rồi đấy, Bluey. Ừm, vâng... em nói đúng."
  },
  {
    "id": 67,
    "start": 357.85,
    "end": 365.2,
    "text": "Und den Schlüssel muss man nur in der Tasche haben. Man muss ihn nicht mal raus... Stripe, bitte hör auf, über dein Auto zu reden!",
    "vi": "Và chìa khóa thì chỉ cần để trong túi thôi. Thậm chí không cần phải rút ra... Stripe à, làm ơn đừng có nói mãi về chiếc xe của anh nữa!"
  },
  {
    "id": 68,
    "start": 365.35,
    "end": 372.0,
    "text": "Ihre Pizzen sind da! Ah, toll! Na ja, erstmal nur eine. Wie ist es in Italien? Äh, gut.",
    "vi": "Pizza của quý khách đến rồi đây ạ! A, tuyệt quá! À, tạm thời chỉ có một chiếc thôi. Ở Ý thế nào ạ? À, tốt lắm."
  },
  {
    "id": 69,
    "start": 372.05,
    "end": 378.5,
    "text": "Hier, bitte sehr! Guten Hunger! Äh... danke. Ich bin gleich wieder zurück! Ups!",
    "vi": "Đây, xin mời quý khách! Chúc ngon miệng nhé! À... cảm ơn cháu. Tôi sẽ quay lại ngay đây! Ôi thôi!"
  },
  {
    "id": 70,
    "start": 378.85,
    "end": 386.5,
    "text": "Oh weh! Vielleicht ist es wirklich an der Zeit für ein neues Auto, Bluey. Auf keinen Fall! Ich habe das Teil, seit ich 2 bin!",
    "vi": "Trời ơi! Có lẽ đã thực sự đến lúc phải mua một chiếc xe mới rồi, Bluey à. Không đời nào đâu! Cháu đã có chiếc xe này từ khi mới 2 tuổi rồi đấy!"
  },
  {
    "id": 71,
    "start": 386.85,
    "end": 395.0,
    "text": "Hallo, Mechaniker! Ich hab eine Panne! Komme! Hi, ich möchte Ihr Auto reparieren!",
    "vi": "Xin chào bác thợ máy! Xe của tôi bị hỏng rồi! Đến ngay đây! Chào quý khách, tôi muốn sửa xe giúp quý khách!"
  },
  {
    "id": 72,
    "start": 395.35,
    "end": 404.5,
    "text": "Du meine Güte, das ging ja schnell! Repariert! Nicht schlecht, oder? So gut wie neu!",
    "vi": "Trời đất ơi, nhanh thật đấy! Đã sửa xong rồi! Không tồi chút nào đúng không? Tốt như mới luôn!"
  }
];

let kinoCurrentIndex = 0;
let kinoPlaybackRate = 1.0;
let kinoShowSubtitles = false;
let kinoListenCountMap = {}; // tracks how many times user listened per sentence
let kinoAttemptCountMap = {}; // tracks dictation attempts per sentence
let kinoFailCountMap = {};
let kinoCompletedSet = new Set();
let kinoUnlockedIndex = 0; // Highest unlocked sentence index
let kinoDubbingRecorder = null;
let kinoDubbingAudioChunks = [];
let kinoDubbingBlobUrls = {}; // map of index -> blobUrl
let kinoIsDubbing = false;
let kinoTimeupdateListener = null;

// Play Bluey Cartoon Sound Effect (synthesized Web Audio for pure offline resilience)
function playBlueyChime(type){
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if(type === 'correct'){
      // Happy Boing-Ding Chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // C6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if(type === 'wrong'){
      // Gentle cartoon thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if(type === 'beep'){
      // Countdown beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if(type === 'boop'){
      // Countdown start boop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1320, ctx.currentTime);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch(e){}
}

// Confetti burst for celebrations
function triggerKinoConfetti(){
  try {
    if(typeof confetti === 'function'){
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    }
  } catch(e){}
}

function loadKinoPersistentProgress(){
  try {
    const saved = localStorage.getItem('vokabelgo_kino_pizzaschwester_v3');
    if(saved){
      const d = JSON.parse(saved);
      kinoCompletedSet = new Set(d.completed || []);
      kinoUnlockedIndex = d.unlockedIndex || 0;
      return true;
    }
  } catch(e){}
  return false;
}

function saveKinoPersistentProgress(){
  try {
    localStorage.setItem('vokabelgo_kino_pizzaschwester_v3', JSON.stringify({
      completed: [...kinoCompletedSet],
      unlockedIndex: kinoUnlockedIndex,
      lastActiveIndex: kinoCurrentIndex
    }));
  } catch(e){}
}

function initKinoV2(){
  const hadSaved = loadKinoPersistentProgress();
  const video = document.getElementById('kinoMainVideo');
  if(video && (!video.src || !video.src.includes('pizzaschwester.mp4'))){
    video.src = 'video/pizzaschwester.mp4';
  }

  renderKinoTimelineList();

  // If returning user has progress > 0, ask with welcome modal
  if(hadSaved && kinoCompletedSet.size > 0 && !sessionStorage.getItem('kino_welcomed')){
    sessionStorage.setItem('kino_welcomed', '1');
    document.getElementById('kinoWelcomeMsg').innerHTML = `Bạn đã hoàn thành <b>${kinoCompletedSet.size} / 72 câu</b>.`;
    document.getElementById('kinoWelcomeModal').classList.remove('hidden');
  } else {
    loadKinoSentence(kinoUnlockedIndex);
  }

  bindKinoTextareaEnter();
}

function kinoResumeStartOver(){
  document.getElementById('kinoWelcomeModal').classList.add('hidden');
  loadKinoSentence(0);
}

function kinoResumeContinue(){
  document.getElementById('kinoWelcomeModal').classList.add('hidden');
  loadKinoSentence(kinoUnlockedIndex);
}

function bindKinoTextareaEnter(){
  const textarea = document.getElementById('kinoDiktatInput');
  if(textarea){
    textarea.onkeydown = (e) => {
      if(e.key === 'Enter' && !e.shiftKey){
        e.preventDefault();
        checkKinoDiktat();
      }
    };
  }
}

function loadKinoSentence(idx){
  if(idx < 0) idx = 0;
  if(idx >= PIZZASCHWESTER_72_SEGMENTS.length) idx = PIZZASCHWESTER_72_SEGMENTS.length - 1;
  kinoCurrentIndex = idx;
  const seg = PIZZASCHWESTER_72_SEGMENTS[idx];

  // Update Progress Bar & Counters
  const total = PIZZASCHWESTER_72_SEGMENTS.length;
  const doneCount = kinoCompletedSet.size;
  const pct = Math.round((doneCount / total) * 100);

  document.getElementById('kinoStreakText').textContent = `${doneCount} câu`;
  document.getElementById('kinoProgressCount').textContent = `${doneCount} / ${total} câu (${pct}%)`;
  document.getElementById('kinoMeterFill').style.width = `${Math.max(2, pct)}%`;

  // Milestone passed styling
  document.getElementById('mile25').classList.toggle('passed', pct >= 25);
  document.getElementById('mile50').classList.toggle('passed', pct >= 50);
  document.getElementById('mile75').classList.toggle('passed', pct >= 75);
  document.getElementById('mile100').classList.toggle('passed', pct >= 100);

  // Time & Info
  const dur = (seg.end - seg.start).toFixed(1);
  const startStr = formatKinoSeconds(seg.start);
  const endStr = formatKinoSeconds(seg.end);
  document.getElementById('kinoTimeTag').textContent = `⏱️ ${startStr} ➔ ${endStr} (${dur}s) · Câu #${String(idx + 1).padStart(2, '0')} / ${total}`;

  // Overlay text
  document.getElementById('kinoOverlayDe').textContent = seg.text;
  document.getElementById('kinoOverlayVi').textContent = seg.vi;

  // Dub Target
  document.getElementById('kinoDubTargetDe').textContent = seg.text;
  document.getElementById('kinoDubTargetVi').textContent = seg.vi;

  // Reset Subtitle Anti-Cheat State
  updateSubtitleLockState(idx);

  // Reset Input & Feedback
  const input = document.getElementById('kinoDiktatInput');
  if(input) input.value = '';
  const fb = document.getElementById('kinoFeedbackBox');
  if(fb) fb.classList.add('hidden');
  const copyBox = document.getElementById('kinoCopyToPassBox');
  if(copyBox) copyBox.classList.add('hidden');

  // Reset Dubbing replay controls
  const replayRow = document.getElementById('kinoDubReplayRow');
  if(replayRow){
    if(kinoDubbingBlobUrls[idx]){
      replayRow.classList.remove('hidden');
      document.getElementById('kinoDubStatusTip').textContent = '✅ Câu này đã có bản lồng tiếng của bạn!';
    } else {
      replayRow.classList.add('hidden');
      document.getElementById('kinoDubStatusTip').textContent = 'Nhấn nút Micro để đếm ngược 3-2-1 và nói theo nhân vật!';
    }
  }

  // Next button enabled only if next sentence is unlocked
  const nextBtn = document.getElementById('kinoNextBtn');
  if(nextBtn){
    nextBtn.disabled = (idx >= kinoUnlockedIndex);
  }

  // Seek video and freeze at start frame
  const video = document.getElementById('kinoMainVideo');
  if(video){
    video.pause();
    video.currentTime = seg.start;
  }

  updateActiveTimelineItem(idx);
}

function formatKinoSeconds(sec){
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(4, '0')}`;
}

// Anti-Cheat: Subtitle locked until listened 2 times or attempted typing 1 time
function updateSubtitleLockState(idx){
  const listens = kinoListenCountMap[idx] || 0;
  const attempts = kinoAttemptCountMap[idx] || 0;
  const isDone = kinoCompletedSet.has(PIZZASCHWESTER_72_SEGMENTS[idx].id);

  const canUnlock = isDone || listens >= 2 || attempts >= 1;
  const subBtn = document.getElementById('kinoToggleSubBtn');
  const lockStatus = document.getElementById('kinoSubLockStatus');

  if(canUnlock){
    subBtn.innerHTML = `👁️ <span>Phụ đề</span>`;
    subBtn.title = "Bật/Tắt phụ đề tiếng Đức";
    if(lockStatus) lockStatus.innerHTML = `✅ Đã mở khóa xem phụ đề`;
  } else {
    subBtn.innerHTML = `🔒 <span>Phụ đề</span>`;
    subBtn.title = `Nghe thêm ${2 - listens} lần nữa để mở phụ đề!`;
    if(lockStatus) lockStatus.innerHTML = `🔒 Nghe ${listens}/2 lần hoặc gõ thử để mở phụ đề`;
  }
}

function playKinoCurrentSegment(rate){
  const video = document.getElementById('kinoMainVideo');
  if(!video) return;
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  // Increment listen counter
  kinoListenCountMap[kinoCurrentIndex] = (kinoListenCountMap[kinoCurrentIndex] || 0) + 1;
  updateSubtitleLockState(kinoCurrentIndex);

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
    kinoTimeupdateListener = null;
  }

  video.playbackRate = rate || kinoPlaybackRate;
  video.currentTime = seg.start;
  video.muted = false;

  const playPromise = video.play();
  if(playPromise !== undefined){
    playPromise.catch(e => console.log("Play interrupted or pending", e));
  }

  // Natural pause at freeze frame
  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      video.pause();
      video.currentTime = seg.end; // Freeze at exact end frame
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);
}

function prevKinoSentence(){
  if(kinoCurrentIndex > 0){
    loadKinoSentence(kinoCurrentIndex - 1);
    playKinoCurrentSegment();
  }
}

function nextKinoSentence(){
  if(kinoCurrentIndex < kinoUnlockedIndex && kinoCurrentIndex < PIZZASCHWESTER_72_SEGMENTS.length - 1){
    loadKinoSentence(kinoCurrentIndex + 1);
    playKinoCurrentSegment();
  }
}

function toggleKinoSpeed(){
  kinoPlaybackRate = (kinoPlaybackRate === 1.0) ? 0.75 : 1.0;
  const btn = document.getElementById('kinoSpeedBtn');
  if(btn){
    btn.innerHTML = `🐢 <span>${kinoPlaybackRate.toFixed(2)}x</span>`;
    btn.classList.toggle('active', kinoPlaybackRate < 1.0);
  }
  const video = document.getElementById('kinoMainVideo');
  if(video) video.playbackRate = kinoPlaybackRate;
}

function toggleKinoSubtitles(){
  const idx = kinoCurrentIndex;
  const listens = kinoListenCountMap[idx] || 0;
  const attempts = kinoAttemptCountMap[idx] || 0;
  const isDone = kinoCompletedSet.has(PIZZASCHWESTER_72_SEGMENTS[idx].id);

  if(!isDone && listens < 2 && attempts < 1){
    alert("🔒 Bạn hãy nghe câu này ít nhất 2 lần (hoặc gõ thử 1 lần) để rèn luyện đôi tai trước khi mở phụ đề nhé!");
    return;
  }

  kinoShowSubtitles = !kinoShowSubtitles;
  const overlay = document.getElementById('kinoSubOverlay');
  if(overlay) overlay.classList.toggle('hidden-sub', !kinoShowSubtitles);
  const btn = document.getElementById('kinoToggleSubBtn');
  if(btn) btn.classList.toggle('active', kinoShowSubtitles);
}

function insertKinoChar(char){
  const textarea = document.getElementById('kinoDiktatInput');
  if(!textarea) return;
  const start = textarea.selectionStart || textarea.value.length;
  const end = textarea.selectionEnd || textarea.value.length;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + char + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + 1;
  textarea.focus();
}

// Normalize for tolerant checking (ignore punctuation, lower)
function normalizeKinoClean(s){
  return String(s || '').toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'…!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function checkKinoDiktat(){
  const input = document.getElementById('kinoDiktatInput');
  const userVal = input ? input.value.trim() : '';
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  kinoAttemptCountMap[kinoCurrentIndex] = (kinoAttemptCountMap[kinoCurrentIndex] || 0) + 1;
  updateSubtitleLockState(kinoCurrentIndex);

  const cleanUser = normalizeKinoClean(userVal);
  const cleanTarget = normalizeKinoClean(seg.text);

  const fbBox = document.getElementById('kinoFeedbackBox');
  const fbStatus = document.getElementById('kinoFeedbackStatus');
  const diffBox = document.getElementById('kinoWordDiffBox');
  const copyBox = document.getElementById('kinoCopyToPassBox');
  const fbVi = document.getElementById('kinoFeedbackVi');

  fbBox.classList.remove('hidden');
  fbVi.textContent = `🇻🇳 Nghĩa: "${seg.vi}"`;

  if(cleanUser === cleanTarget){
    // CORRECT!
    playBlueyChime('correct');
    triggerKinoConfetti();

    fbStatus.textContent = '🎉 Tuyệt vời! Chính xác 100%! Rất giỏi!';
    fbStatus.className = 'kino-v3-fb-status correct';
    diffBox.innerHTML = `<span class="kino-diff-word correct">${seg.text}</span>`;
    copyBox.classList.add('hidden');

    // Add to completed set
    const isFirstTime = !kinoCompletedSet.has(seg.id);
    kinoCompletedSet.add(seg.id);

    // Unlock next sentence!
    if(kinoCurrentIndex >= kinoUnlockedIndex && kinoUnlockedIndex < PIZZASCHWESTER_72_SEGMENTS.length - 1){
      kinoUnlockedIndex = kinoCurrentIndex + 1;
    }

    saveKinoPersistentProgress();
    renderKinoTimelineList();
    loadKinoSentence(kinoCurrentIndex);

    // Invite dubbing
    const dubBtn = document.getElementById('kinoDubRecordBtn');
    if(dubBtn) dubBtn.classList.add('highlight');

    // Cat companion cheer
    try {
      if(typeof showCatSpeech === 'function'){
        showCatSpeech("Super gemacht! Du bist genial! 🐾", "Làm tốt lắm bạn ơi! Nghe chuẩn đét luôn nè!", 5000);
      }
    } catch(e){}

    // Check milestones (25%, 50%, 75%, 100%)
    const pct = Math.round((kinoCompletedSet.size / PIZZASCHWESTER_72_SEGMENTS.length) * 100);
    if(isFirstTime){
      if(pct === 100){
        setTimeout(() => {
          triggerKinoConfetti();
          document.getElementById('kinoVictoryModal').classList.remove('hidden');
        }, 600);
      } else if(pct === 25 || pct === 50 || pct === 75){
        triggerKinoConfetti();
      }
    }

  } else {
    // INCORRECT OR PARTIAL
    playBlueyChime('wrong');
    kinoFailCountMap[kinoCurrentIndex] = (kinoFailCountMap[kinoCurrentIndex] || 0) + 1;
    const fails = kinoFailCountMap[kinoCurrentIndex];

    fbStatus.textContent = '💡 Gần đúng rồi! Hãy xem các từ đối chiếu dưới đây:';
    fbStatus.className = 'kino-v3-fb-status partial';

    // Word Diff Rendering
    renderKinoWordDiff(userVal, seg.text, diffBox);

    // Copy-to-pass mechanism if failed 3 times
    if(fails >= 3){
      copyBox.classList.remove('hidden');
      copyBox.innerHTML = `
        <b>💡 Chế độ Chép mẫu để vượt qua:</b><br>
        Câu mẫu chuẩn: <b>"${seg.text}"</b><br>
        <i>Hãy gõ lại đúng câu mẫu trên vào ô để rèn luyện mặt chữ và mở khóa câu kế tiếp nhé!</i>
      `;
    } else {
      copyBox.classList.add('hidden');
    }
  }
}

function renderKinoWordDiff(userVal, targetVal, container){
  container.innerHTML = '';
  const userWords = userVal.split(/\s+/).filter(w => w);
  const targetWords = targetVal.split(/\s+/).filter(w => w);

  targetWords.forEach((tw, idx) => {
    const uw = userWords[idx];
    const cleanTw = normalizeKinoClean(tw);
    const cleanUw = normalizeKinoClean(uw);

    const span = document.createElement('span');
    if(!uw){
      span.className = 'kino-diff-word missing';
      span.textContent = `[?] (${cleanTw.charAt(0)}...)`;
      span.title = "Từ còn thiếu";
    } else if(cleanTw === cleanUw){
      span.className = 'kino-diff-word correct';
      span.textContent = tw;
    } else {
      span.className = 'kino-diff-word wrong';
      span.textContent = uw;
      span.title = `Chưa đúng. Gợi ý: bắt đầu bằng '${cleanTw.charAt(0)}'`;
    }
    container.appendChild(span);
  });
}

// First-letter hint: P___
function giveKinoFirstLetterHint(){
  const input = document.getElementById('kinoDiktatInput');
  if(!input) return;
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;

  const targetWords = seg.text.split(/\s+/).filter(w => w);
  const userWords = input.value.trim().split(/\s+/).filter(w => w);

  if(userWords.length < targetWords.length){
    const nextTarget = targetWords[userWords.length];
    const hint = nextTarget.charAt(0) + '_'.repeat(Math.max(1, nextTarget.length - 1));
    alert(`💡 Gợi ý từ tiếp theo: "${hint}" (${nextTarget.length} chữ cái)`);
  } else {
    alert(`💡 Gợi ý chữ cái đầu của cả câu: "${seg.text.charAt(0)}..."`);
  }
  input.focus();
}

function revealKinoAnswer(){
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!seg) return;
  const fbBox = document.getElementById('kinoFeedbackBox');
  const fbStatus = document.getElementById('kinoFeedbackStatus');
  const diffBox = document.getElementById('kinoWordDiffBox');
  const fbVi = document.getElementById('kinoFeedbackVi');

  fbBox.classList.remove('hidden');
  fbStatus.textContent = '📖 Đáp án câu thoại & Bản dịch:';
  fbStatus.className = 'kino-v3-fb-status';
  diffBox.innerHTML = `<span class="kino-diff-word correct" style="font-size:15px;">${seg.text}</span>`;
  fbVi.textContent = `🇻🇳 Nghĩa: "${seg.vi}"`;
}

// --------------------------------------------------------------------------
// 🎙️ DUBBING / LỒNG TIẾNG ENGINE
// --------------------------------------------------------------------------
async function startKinoDubbingProcess(){
  if(kinoIsDubbing){
    stopKinoDubbing();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    runKinoCountdown(() => runKinoDubbingRecording(stream));
  } catch(err){
    alert("Không thể mở Micro. Xin vui lòng cho phép quyền truy cập Micro trên trình duyệt để luyện lồng tiếng!");
    console.error("Mic error:", err);
  }
}

// 3-2-1 Countdown
function runKinoCountdown(callback){
  const hud = document.getElementById('kinoCountdownHud');
  const numEl = document.getElementById('kinoCountNumber');
  hud.classList.remove('hidden');

  let count = 3;
  numEl.textContent = count;
  playBlueyChime('beep');

  const timer = setInterval(() => {
    count--;
    if(count > 0){
      numEl.textContent = count;
      playBlueyChime('beep');
    } else {
      clearInterval(timer);
      playBlueyChime('boop');
      hud.classList.add('hidden');
      callback();
    }
  }, 900);
}

function runKinoDubbingRecording(stream){
  const video = document.getElementById('kinoMainVideo');
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!video || !seg) return;

  kinoIsDubbing = true;
  kinoDubbingAudioChunks = [];
  kinoDubbingRecorder = new MediaRecorder(stream);

  kinoDubbingRecorder.ondataavailable = (e) => {
    if(e.data.size > 0) kinoDubbingAudioChunks.push(e.data);
  };

  kinoDubbingRecorder.onstop = () => {
    const blob = new Blob(kinoDubbingAudioChunks, { type: 'audio/webm' });
    if(kinoDubbingBlobUrls[kinoCurrentIndex]){
      URL.revokeObjectURL(kinoDubbingBlobUrls[kinoCurrentIndex]);
    }
    kinoDubbingBlobUrls[kinoCurrentIndex] = URL.createObjectURL(blob);

    // Stop mic stream
    stream.getTracks().forEach(t => t.stop());

    // Update UI
    document.getElementById('kinoDubReplayRow').classList.remove('hidden');
    document.getElementById('kinoDubStatusTip').textContent = '✅ Đã lồng tiếng xong! Bấm "Giọng của bạn" để nghe lại!';

    // Auto replay immediately (As requested by user in Question 18)!
    replayKinoDubbing();
  };

  // Audio mute toggle (Tắt sạch 100% hoặc giữ 15% làm mẫu)
  const keep15 = document.getElementById('kinoDubKeepAudioCheck').checked;
  video.currentTime = seg.start;
  video.muted = !keep15;
  if(keep15) video.volume = 0.15;
  video.playbackRate = 1.0;

  // Show HUD
  document.getElementById('kinoRecordingHud').classList.remove('hidden');
  document.getElementById('kinoHudSub').textContent = `"${seg.text}"`;
  document.getElementById('kinoDubBtnText').textContent = 'Đang ghi âm... Nhấn để dừng';
  document.getElementById('kinoDubRecordBtn').classList.add('recording');

  video.play();
  kinoDubbingRecorder.start();

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
  }

  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      stopKinoDubbing();
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);
}

function stopKinoDubbing(){
  kinoIsDubbing = false;
  const video = document.getElementById('kinoMainVideo');
  if(video){
    video.pause();
    if(kinoTimeupdateListener){
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  }

  if(kinoDubbingRecorder && kinoDubbingRecorder.state !== 'inactive'){
    kinoDubbingRecorder.stop();
  }

  const recBtn = document.getElementById('kinoDubRecordBtn');
  if(recBtn) recBtn.classList.remove('recording');
  document.getElementById('kinoDubBtnText').textContent = 'Bắt đầu lồng tiếng câu này';
  document.getElementById('kinoRecordingHud').classList.add('hidden');
}

function replayKinoDubbing(){
  const blobUrl = kinoDubbingBlobUrls[kinoCurrentIndex];
  if(!blobUrl) return;
  const video = document.getElementById('kinoMainVideo');
  const seg = PIZZASCHWESTER_72_SEGMENTS[kinoCurrentIndex];
  if(!video || !seg) return;

  const userAudio = new Audio(blobUrl);
  video.currentTime = seg.start;
  video.muted = true; // Mute original, play user voice
  video.playbackRate = 1.0;

  if(kinoTimeupdateListener){
    video.removeEventListener('timeupdate', kinoTimeupdateListener);
  }

  kinoTimeupdateListener = function(){
    if(video.currentTime >= seg.end){
      video.pause();
      userAudio.pause();
      video.removeEventListener('timeupdate', kinoTimeupdateListener);
      kinoTimeupdateListener = null;
    }
  };
  video.addEventListener('timeupdate', kinoTimeupdateListener);

  video.play();
  userAudio.play();
  document.getElementById('kinoDubStatusTip').textContent = '▶️ Đang phát video ghép với giọng của bạn!';
}

// --------------------------------------------------------------------------
// 📜 72-SENTENCE LINEAR UNLOCK TIMELINE
// --------------------------------------------------------------------------
function renderKinoTimelineList(){
  const container = document.getElementById('kinoTimelineList');
  if(!container) return;
  container.innerHTML = '';

  PIZZASCHWESTER_72_SEGMENTS.forEach((seg, idx) => {
    const isUnlocked = (idx <= kinoUnlockedIndex);
    const isDone = kinoCompletedSet.has(seg.id);
    const isCurrent = (idx === kinoCurrentIndex);

    const row = document.createElement('div');
    row.className = `kino-v3-timeline-row ${isCurrent ? 'active' : ''} ${!isUnlocked ? 'locked' : ''}`;
    row.id = `kinoRow_${idx}`;

    if(isUnlocked){
      row.onclick = () => {
        loadKinoSentence(idx);
        playKinoCurrentSegment();
      };
    } else {
      row.onclick = () => {
        alert(`🔒 Câu #${idx + 1} chưa mở khóa! Bạn hãy hoàn thành câu trước để mở khóa câu này nhé!`);
      };
    }

    const startStr = formatKinoSeconds(seg.start);
    const textPreview = isUnlocked ? seg.text : '•••••••••••••••••••••••••';

    row.innerHTML = `
      <div class="kino-v3-t-left">
        <span class="kino-v3-t-num">#${String(idx + 1).padStart(2, '0')}</span>
        <span class="kino-v3-t-time">${startStr}</span>
        <span class="kino-v3-t-text">${textPreview}</span>
      </div>
      <div class="kino-v3-t-status">
        ${isDone ? '✅' : (isUnlocked ? '⚪' : '🔒')}
      </div>
    `;
    container.appendChild(row);
  });

  document.getElementById('kinoTimelineStats').textContent = `(Đã mở khóa: ${kinoUnlockedIndex + 1} / ${PIZZASCHWESTER_72_SEGMENTS.length} câu)`;
}

function updateActiveTimelineItem(activeIdx){
  document.querySelectorAll('.kino-v3-timeline-row').forEach((row, idx) => {
    row.classList.toggle('active', idx === activeIdx);
  });

  const activeRow = document.getElementById(`kinoRow_${activeIdx}`);
  if(activeRow){
    activeRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function toggleKinoTimeline(){
  const body = document.getElementById('kinoTimelineBody');
  const btn = document.getElementById('kinoTimelineCollapseBtn');
  if(!body || !btn) return;
  const isHidden = body.classList.toggle('collapsed');
  btn.textContent = isHidden ? 'Mở rộng ▼' : 'Thu gọn ▲';
}

// --------------------------------------------------------------------------
// 🍿 FULL MOVIE MODE (06:59 MỘC KHÔNG PHỤ ĐỀ)
// --------------------------------------------------------------------------
function openKinoFullMovieModal(){
  const modal = document.getElementById('kinoFullMovieModal');
  const player = document.getElementById('kinoFullPlayer');
  const mainVideo = document.getElementById('kinoMainVideo');
  if(mainVideo) mainVideo.pause();

  modal.classList.remove('hidden');
  player.currentTime = 0;
  player.play();
}

function closeKinoFullMovieModal(){
  const modal = document.getElementById('kinoFullMovieModal');
  const player = document.getElementById('kinoFullPlayer');
  player.pause();
  modal.classList.add('hidden');
}

// --------------------------------------------------------------------------
// 📇 VOCAB REVIEW BUTTON (Flashcard jump)
// --------------------------------------------------------------------------
function reviewCurrentVideoVocab(){
  // Switch to Flashcards mode and filter by Bluey Pizza deck
  if(typeof setMode === 'function'){
    setMode('flash');
  }
  const sel = document.getElementById('deckSelect');
  if(sel){
    sel.value = '🎬 Video: Bluey – Pizza-Schwestern';
    if(typeof applyFilter === 'function') applyFilter();
  }
}

function closeKinoVictoryModal(){
  document.getElementById('kinoVictoryModal').classList.add('hidden');
}

function playKinoMixtape(){
  closeKinoVictoryModal();
  openKinoFullMovieModal();
}
